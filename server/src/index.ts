import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { createClient } from 'redis';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import { PORT, CLIENT_URL, REDIS_URL, MONGODB_URI, GAME_CONFIG, TURN_ORDER } from './config';
import { GameStateManager } from './game/GameStateManager';
import { Game } from './models/Game';
import type {
  GameState, Player, ChatMessage, DrawMovePayload,
  JoinPayload, ReconnectPayload, ChatSendPayload,
} from './types/index';

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Redis ────────────────────────────────────────────────────────────────────

let gsm: GameStateManager;

async function connectRedis(): Promise<void> {
  try {
    const client = createClient({ url: REDIS_URL });
    client.on('error', () => { /* suppress */ });
    await client.connect();
    gsm = new GameStateManager(client as any);
    console.log('✅ Redis connected');
  } catch {
    console.warn('⚠️  Redis unavailable — using in-memory fallback');
    const store = new Map<string, string>();
    const fallback = {
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: string) => { store.set(k, v); return 'OK' as const; },
      del: async (k: string) => { store.delete(k); return 1; },
    };
    gsm = new GameStateManager(fallback as any);
  }
}

// ─── MongoDB ──────────────────────────────────────────────────────────────────

async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch {
    console.warn('⚠️  MongoDB unavailable — game history disabled');
  }
}

// ─── Timer management ─────────────────────────────────────────────────────────

interface TimerHandle { interval: ReturnType<typeof setInterval>; timeout: ReturnType<typeof setTimeout>; }
const activeTimers = new Map<string, TimerHandle>();

function clearGameTimer(gameId: string): void {
  const t = activeTimers.get(gameId);
  if (t) { clearInterval(t.interval); clearTimeout(t.timeout); activeTimers.delete(gameId); }
}

function startRoundTimer(gameId: string, onExpire: () => Promise<void>): void {
  clearGameTimer(gameId);
  let remaining = GAME_CONFIG.roundDuration;

  io.to(gameId).emit('timer:tick', { remaining });

  const interval = setInterval(() => {
    remaining--;
    io.to(gameId).emit('timer:tick', { remaining });
    if (remaining <= 0) clearGameTimer(gameId);
  }, 1000);

  const timeout = setTimeout(async () => {
    clearInterval(interval);
    activeTimers.delete(gameId);
    await onExpire();
  }, GAME_CONFIG.roundDuration * 1000);

  activeTimers.set(gameId, { interval, timeout });
}

// ─── Private broadcast (strips word for non-artists) ─────────────────────────

function sanitizeForPlayer(state: GameState, playerIndex: number): GameState {
  return { ...state, currentWord: playerIndex === state.currentArtistIndex ? state.currentWord : null };
}

function broadcastStatePrivately(gameId: string, state: GameState): void {
  const room = io.sockets.adapter.rooms.get(gameId);
  if (!room) return;
  for (const socketId of room) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) {
      const pIdx = (sock.data as { playerIndex?: number }).playerIndex ?? -1;
      sock.emit('game:state', sanitizeForPlayer(state, pIdx));
    }
  }
}

// ─── Game flow ────────────────────────────────────────────────────────────────

async function handleRoundExpiry(gameId: string): Promise<void> {
  const state = await gsm.getState(gameId);
  if (!state || state.roundResolved) return;

  await gsm.resolveRound(gameId, -1);

  io.to(gameId).emit('round:timeout', { word: state.currentWord });
  io.to(gameId).emit('chat:message', {
    type: 'system',
    text: `⏰ Time's up! The word was: "${state.currentWord}"`,
    timestamp: Date.now(),
  } satisfies ChatMessage);

  setTimeout(() => advanceToNextTurn(gameId), 3500);
}

async function advanceToNextTurn(gameId: string): Promise<void> {
  const result = await gsm.nextTurn(gameId);
  if (!result) return;

  if (result.finished) {
    io.to(gameId).emit('game:finished', {
      scores: result.state.scores,
      players: result.state.players,
      config: result.state.config,
    });
    await persistGameEnd(gameId, result.state);
    return;
  }

  const { state } = result;
  broadcastStatePrivately(gameId, state);
  io.to(gameId).emit('timer:tick', { remaining: GAME_CONFIG.roundDuration });

  const artistName = state.players[state.currentArtistIndex ?? 0]?.name ?? 'Unknown';
  io.to(gameId).emit('chat:message', {
    type: 'system',
    text: `📋 Round ${state.roundNumber}/${state.config.totalRounds} — ${artistName} is drawing!`,
    timestamp: Date.now(),
  } satisfies ChatMessage);

  startRoundTimer(gameId, () => handleRoundExpiry(gameId));
}

// ─── REST ─────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', config: GAME_CONFIG });
});

app.get('/api/config', (_req, res) => {
  res.json(GAME_CONFIG);
});

app.post('/api/game/create', async (req, res) => {
  try {
    const gameId = uuidv4().slice(0, 8).toUpperCase();
    const state = gsm.createInitialState(gameId, GAME_CONFIG);
    await gsm.setState(gameId, state);
    res.json({ gameId, config: GAME_CONFIG });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/game/:gameId', async (req, res) => {
  const state = await gsm.getState(req.params.gameId ?? '');
  if (!state) return res.status(404).json({ error: 'Game not found' });
  return res.json(sanitizeForPlayer(state, -1));
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  console.log(`🔌 connected: ${socket.id}`);

  socket.on('game:join', async (payload: JoinPayload) => {
    const { gameId, playerName } = payload;
    if (!gameId || !playerName?.trim()) return;

    const result = await gsm.addPlayer(
      gameId,
      { socketId: socket.id, name: playerName.trim() },
      GAME_CONFIG,
    );

    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    const { player, state } = result;
    socket.join(gameId);
    (socket.data as any).gameId = gameId;
    (socket.data as any).playerIndex = player.playerIndex;

    broadcastStatePrivately(gameId, state);
    io.to(gameId).emit('chat:message', {
      type: 'system',
      text: `${player.name} joined · Player ${player.playerIndex + 1} · Team ${player.teamId + 1}`,
      timestamp: Date.now(),
    } satisfies ChatMessage);

    if (state.players.length === state.config.maxPlayers) {
      setTimeout(async () => {
        const startResult = await gsm.startGame(gameId);
        if ('error' in startResult) return;
        const { state: gs } = startResult;

        broadcastStatePrivately(gameId, gs);
        io.to(gameId).emit('game:started');

        const firstArtist = gs.players[gs.currentArtistIndex ?? 0]?.name ?? 'Unknown';
        io.to(gameId).emit('chat:message', {
          type: 'system',
          text: `🎨 Game started! ${firstArtist} draws first.`,
          timestamp: Date.now(),
        } satisfies ChatMessage);

        startRoundTimer(gameId, () => handleRoundExpiry(gameId));
        await persistGameStart(gameId, gs);
      }, 2000);
    }
  });

  socket.on('game:reconnect', async (payload: ReconnectPayload) => {
    const { gameId, playerIndex } = payload;
    const state = await gsm.updatePlayerSocket(gameId, playerIndex, socket.id);
    if (!state) { socket.emit('error', { message: 'Game not found' }); return; }

    socket.join(gameId);
    (socket.data as any).gameId = gameId;
    (socket.data as any).playerIndex = playerIndex;
    socket.emit('game:state', sanitizeForPlayer(state, playerIndex));
  });

  // Drawing events — rebroadcast to room (excluding sender)
  socket.on('draw:start', (data: unknown) => {
    socket.to((socket.data as any).gameId).emit('draw:start', data);
  });
  socket.on('draw:move', (data: DrawMovePayload) => {
    socket.to((socket.data as any).gameId).emit('draw:move', data);
  });
  socket.on('draw:end', () => {
    socket.to((socket.data as any).gameId).emit('draw:end');
  });
  socket.on('draw:clear', () => {
    socket.to((socket.data as any).gameId).emit('draw:clear');
  });

  // Chat / guess
  socket.on('chat:send', async (payload: ChatSendPayload) => {
    const { gameId, playerIndex } = socket.data as { gameId?: string; playerIndex?: number };
    if (!gameId || playerIndex == null || !payload.text?.trim()) return;

    const state = await gsm.getState(gameId);
    if (!state || state.status !== 'playing') return;

    const player = state.players[playerIndex];
    if (!player) return;

    const isArtist = playerIndex === state.currentArtistIndex;
    if (isArtist) {
      socket.emit('chat:message', {
        type: 'system',
        text: "You're drawing — no guessing!",
        timestamp: Date.now(),
      } satisfies ChatMessage);
      return;
    }

    const artist = state.currentArtistIndex !== null ? state.players[state.currentArtistIndex] : null;
    const isTeammate = artist ? player.teamId === artist.teamId : false;
    const normalised = payload.text.trim().toLowerCase();
    const isCorrect = isTeammate && !state.roundResolved &&
      normalised === (state.currentWord ?? '').toLowerCase();

    const msg: ChatMessage = {
      type: 'chat',
      playerId: player.playerIndex,
      playerName: player.name,
      teamId: player.teamId,
      text: payload.text.trim(),
      timestamp: Date.now(),
      correct: isCorrect,
    };

    await gsm.addChatMessage(gameId, msg);
    io.to(gameId).emit('chat:message', msg);

    if (isCorrect) {
      const resolution = await gsm.resolveRound(gameId, playerIndex);
      clearGameTimer(gameId);

      const freshState = await gsm.getState(gameId);
      io.to(gameId).emit('round:correct', {
        word: state.currentWord,
        guessedBy: player.name,
        scoringTeam: resolution?.scoringTeam,
        scores: freshState?.scores ?? state.scores,
      });

      setTimeout(() => advanceToNextTurn(gameId), 3500);
    }
  });

  socket.on('disconnect', async () => {
    const { gameId, playerIndex } = socket.data as { gameId?: string; playerIndex?: number };
    if (!gameId) return;
    const state = await gsm.getState(gameId);
    const player = playerIndex !== undefined ? state?.players[playerIndex] : undefined;
    if (player) {
      io.to(gameId).emit('chat:message', {
        type: 'system',
        text: `${player.name} disconnected.`,
        timestamp: Date.now(),
      } satisfies ChatMessage);
    }
    console.log(`🔌 disconnected: ${socket.id}`);
  });
});

// ─── MongoDB persistence ──────────────────────────────────────────────────────

async function persistGameStart(gameId: string, state: GameState): Promise<void> {
  try {
    await Game.findOneAndUpdate(
      { gameId },
      { gameId, players: state.players, config: state.config, status: 'playing', startedAt: new Date() },
      { upsert: true, new: true },
    );
  } catch { /* optional */ }
}

async function persistGameEnd(gameId: string, state: GameState): Promise<void> {
  try {
    await Game.findOneAndUpdate(
      { gameId },
      { status: 'finished', finalScores: state.scores, endedAt: new Date() },
      { new: true },
    );
  } catch { /* optional */ }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  await connectRedis();
  await connectMongo();

  server.listen(PORT, () => {
    console.log(`\n🎨 Pictionary server → http://localhost:${PORT}`);
    console.log(`   Config: ${GAME_CONFIG.maxPlayers} players · ${GAME_CONFIG.numTeams} teams · ${GAME_CONFIG.roundDuration}s rounds\n`);
  });
}

start();
