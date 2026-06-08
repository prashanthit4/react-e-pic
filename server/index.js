require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const GameStateManager = require('./gameState');
const { Game } = require('./models');
const { ROUND_DURATION } = require('./constants');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ── Redis (with in-memory fallback) ──────────────────────────────────────────
let redisClient;
let gsm;

async function connectRedis() {
  redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisClient.on('error', () => {}); // suppress noise
  try {
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (e) {
    console.warn('⚠️  Redis unavailable — using in-memory store (dev only)');
    const store = new Map();
    redisClient = {
      get: async (k) => store.get(k) ?? null,
      set: async (k, v) => { store.set(k, v); return 'OK'; },
      del: async (k) => { store.delete(k); return 1; },
    };
  }
  gsm = new GameStateManager(redisClient);
}

// ── MongoDB (optional) ────────────────────────────────────────────────────────
async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pictionary');
    console.log('✅ MongoDB connected');
  } catch (e) {
    console.warn('⚠️  MongoDB unavailable — persistent history disabled');
  }
}

// ── Timer management ──────────────────────────────────────────────────────────
const activeTimers = new Map();

function clearGameTimer(gameId) {
  const t = activeTimers.get(gameId);
  if (t) {
    clearInterval(t.interval);
    clearTimeout(t.timeout);
    activeTimers.delete(gameId);
  }
}

function startRoundTimer(gameId, onExpire) {
  clearGameTimer(gameId);
  let remaining = ROUND_DURATION;

  // Send initial tick immediately so client shows correct value
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
  }, ROUND_DURATION * 1000);

  activeTimers.set(gameId, { interval, timeout });
}

// ── REST ──────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/game/create', async (req, res) => {
  try {
    const gameId = uuidv4().slice(0, 8).toUpperCase();
    const state = gsm.createInitialState(gameId);
    await gsm.setState(gameId, state);
    res.json({ gameId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/game/:gameId', async (req, res) => {
  const state = await gsm.getState(req.params.gameId);
  if (!state) return res.status(404).json({ error: 'Game not found' });
  res.json(sanitizeForPlayer(state, null));
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 ${socket.id} connected`);

  socket.on('game:join', async ({ gameId, playerName }) => {
    if (!gameId || !playerName) return;

    const result = await gsm.addPlayer(gameId, { socketId: socket.id, name: playerName.trim() });
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.join(gameId);
    socket.data.gameId = gameId;
    socket.data.playerIndex = result.player.playerIndex;

    // Send each player their personalised state view
    broadcastStatePrivately(gameId, result.state);

    io.to(gameId).emit('chat:message', {
      type: 'system',
      text: `${result.player.name} joined • Player ${result.player.playerIndex + 1} • Team ${result.player.teamId + 1}`,
      timestamp: Date.now(),
    });

    // Auto-start when 4 players are in
    if (result.state.players.length === 4) {
      setTimeout(async () => {
        const { state: gs, error } = await gsm.startGame(gameId);
        if (error || !gs) return;

        broadcastStatePrivately(gameId, gs);
        io.to(gameId).emit('game:started');
        io.to(gameId).emit('chat:message', {
          type: 'system',
          text: `🎨 Game started! ${gs.players[gs.currentArtistIndex].name} draws first.`,
          timestamp: Date.now(),
        });

        startRoundTimer(gameId, () => handleRoundExpiry(gameId));
        await persistGameStart(gameId, gs);
      }, 2000);
    }
  });

  socket.on('game:reconnect', async ({ gameId, playerIndex }) => {
    const state = await gsm.updatePlayerSocket(gameId, playerIndex, socket.id);
    if (!state) { socket.emit('error', { message: 'Game not found' }); return; }
    socket.join(gameId);
    socket.data.gameId = gameId;
    socket.data.playerIndex = playerIndex;
    socket.emit('game:state', sanitizeForPlayer(state, playerIndex));
  });

  // ── Drawing ────────────────────────────────────────────────────────────────
  socket.on('draw:start', (data) => {
    socket.to(socket.data.gameId).emit('draw:start', data);
  });
  socket.on('draw:move', (data) => {
    socket.to(socket.data.gameId).emit('draw:move', data);
  });
  socket.on('draw:end', (data) => {
    socket.to(socket.data.gameId).emit('draw:end', data);
  });
  socket.on('draw:clear', () => {
    socket.to(socket.data.gameId).emit('draw:clear');
  });

  // ── Chat / Guess ───────────────────────────────────────────────────────────
  socket.on('chat:send', async ({ text }) => {
    const { gameId, playerIndex } = socket.data;
    if (!gameId || playerIndex == null || !text?.trim()) return;

    const state = await gsm.getState(gameId);
    if (!state || state.status !== 'playing') return;

    const player = state.players[playerIndex];
    if (!player) return;

    const isArtist = playerIndex === state.currentArtistIndex;

    // Artist cannot chat during drawing
    if (isArtist) {
      socket.emit('chat:message', {
        type: 'system',
        text: "You're the artist — you can't guess your own word!",
        timestamp: Date.now(),
      });
      return;
    }

    const artist = state.players[state.currentArtistIndex];
    const isTeammate = player.teamId === artist?.teamId;
    const normalised = text.trim().toLowerCase();
    const isCorrect = isTeammate && !state.roundResolved &&
      normalised === state.currentWord?.toLowerCase();

    const msg = {
      type: 'chat',
      playerId: playerIndex,
      playerName: player.name,
      teamId: player.teamId,
      text: text.trim(),
      timestamp: Date.now(),
      correct: isCorrect,
    };

    if (isCorrect) {
      // Persist and broadcast
      await gsm.addChatMessage(gameId, msg);
      io.to(gameId).emit('chat:message', msg);

      const resolution = await gsm.resolveRound(gameId, playerIndex);
      clearGameTimer(gameId);

      const freshState = await gsm.getState(gameId);
      io.to(gameId).emit('round:correct', {
        word: state.currentWord,
        guessedBy: player.name,
        scoringTeam: resolution.scoringTeam,
        scores: freshState.scores,
      });

      setTimeout(() => advanceToNextTurn(gameId), 3500);
    } else {
      // Prevent opponent from learning the word if they guessed it right (just show their message)
      await gsm.addChatMessage(gameId, msg);
      io.to(gameId).emit('chat:message', msg);
    }
  });

  socket.on('disconnect', async () => {
    const { gameId, playerIndex } = socket.data;
    if (!gameId) return;
    const state = await gsm.getState(gameId);
    const player = state?.players?.[playerIndex];
    if (player) {
      io.to(gameId).emit('chat:message', {
        type: 'system',
        text: `${player.name} disconnected.`,
        timestamp: Date.now(),
      });
    }
    console.log(`🔌 ${socket.id} disconnected`);
  });
});

// ── Game flow ─────────────────────────────────────────────────────────────────
async function handleRoundExpiry(gameId) {
  const state = await gsm.getState(gameId);
  if (!state || state.roundResolved) return;

  // Mark resolved so we don't double-fire
  await gsm.resolveRound(gameId, -1); // -1 = nobody guessed

  io.to(gameId).emit('round:timeout', { word: state.currentWord });
  io.to(gameId).emit('chat:message', {
    type: 'system',
    text: `⏰ Time's up! The word was: "${state.currentWord}"`,
    timestamp: Date.now(),
  });

  setTimeout(() => advanceToNextTurn(gameId), 3500);
}

async function advanceToNextTurn(gameId) {
  const result = await gsm.nextTurn(gameId);
  if (!result) return;

  if (result.finished) {
    io.to(gameId).emit('game:finished', {
      scores: result.state.scores,
      players: result.state.players,
    });
    await persistGameEnd(gameId, result.state);
    return;
  }

  const { state } = result;
  broadcastStatePrivately(gameId, state);
  io.to(gameId).emit('timer:tick', { remaining: ROUND_DURATION }); // reset display
  io.to(gameId).emit('chat:message', {
    type: 'system',
    text: `📋 Round ${state.roundNumber}/${state.totalRounds} — ${state.players[state.currentArtistIndex].name} is drawing!`,
    timestamp: Date.now(),
  });

  startRoundTimer(gameId, () => handleRoundExpiry(gameId));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitizeForPlayer(state, playerIndex) {
  return {
    ...state,
    currentWord: playerIndex === state.currentArtistIndex ? state.currentWord : null,
  };
}

function broadcastStatePrivately(gameId, state) {
  const room = io.sockets.adapter.rooms.get(gameId);
  if (!room) return;
  for (const socketId of room) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) {
      sock.emit('game:state', sanitizeForPlayer(state, sock.data.playerIndex ?? -1));
    }
  }
}

// ── Mongo helpers ─────────────────────────────────────────────────────────────
async function persistGameStart(gameId, state) {
  try {
    await Game.findOneAndUpdate(
      { gameId },
      { gameId, players: state.players, status: 'playing', startedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch { /* mongo optional */ }
}

async function persistGameEnd(gameId, state) {
  try {
    await Game.findOneAndUpdate(
      { gameId },
      { status: 'finished', finalScores: { team0: state.scores[0], team1: state.scores[1] }, endedAt: new Date() },
      { new: true }
    );
  } catch { /* mongo optional */ }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  await connectRedis();
  await connectMongo();
  server.listen(PORT, () => {
    console.log(`\n🎨 Pictionary server running → http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
  });
}

start();
