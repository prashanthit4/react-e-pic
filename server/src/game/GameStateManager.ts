import type { RedisClientType } from 'redis';
import type {
  GameState, GameConfig, Player, PlayerIndex, TeamId,
  AddPlayerResult, ResolveRoundResult, NextTurnResult, ChatMessage,
} from '../types/index';
import { getRandomWord } from './words';
import { TURN_ORDER } from '../config';

type RedisLike = Pick<RedisClientType, 'get' | 'set' | 'del'>;

export class GameStateManager {
  constructor(private readonly redis: RedisLike) {}

  private key(gameId: string): string {
    return `game:${gameId}`;
  }

  async getState(gameId: string): Promise<GameState | null> {
    try {
      const raw = await this.redis.get(this.key(gameId));
      return raw ? (JSON.parse(raw) as GameState) : null;
    } catch {
      return null;
    }
  }

  async setState(gameId: string, state: GameState): Promise<void> {
    try {
      // @ts-ignore — in-memory fallback doesn't support options object
      await this.redis.set(this.key(gameId), JSON.stringify(state), { EX: 7200 });
    } catch {
      try {
        await (this.redis as any).set(this.key(gameId), JSON.stringify(state));
      } catch { /* silent */ }
    }
  }

  createInitialState(gameId: string, config: GameConfig): GameState {
    const scores: Record<number, number> = {};
    for (let t = 0; t < config.numTeams; t++) scores[t] = 0;

    return {
      gameId,
      status: 'waiting',
      players: [],
      scores,
      config,
      currentTurnIndex: 0,
      currentArtistIndex: null,
      currentWord: null,
      roundStartTime: null,
      roundNumber: 0,
      chatHistory: [],
      roundResolved: false,
    };
  }

  async addPlayer(
    gameId: string,
    playerData: Omit<Player, 'playerIndex' | 'teamId'>,
    config: GameConfig,
  ): Promise<AddPlayerResult> {
    let state = await this.getState(gameId);
    if (!state) state = this.createInitialState(gameId, config);

    if (state.players.length >= config.maxPlayers) {
      return { error: `Game is full (${config.maxPlayers}/${config.maxPlayers} players)` };
    }
    if (state.status !== 'waiting') {
      return { error: 'Game has already started' };
    }

    const playerIndex: PlayerIndex = state.players.length;
    const playersPerTeam = Math.floor(config.maxPlayers / config.numTeams);
    const teamId: TeamId = Math.floor(playerIndex / playersPerTeam);

    const player: Player = { ...playerData, playerIndex, teamId };
    state.players.push(player);
    await this.setState(gameId, state);
    return { player, state };
  }

  async startGame(gameId: string): Promise<{ state: GameState } | { error: string }> {
    const state = await this.getState(gameId);
    if (!state) return { error: 'Game not found' };
    if (state.players.length < state.config.maxPlayers) {
      return { error: `Need ${state.config.maxPlayers} players to start` };
    }

    state.status = 'playing';
    state.roundNumber = 1;
    state.currentTurnIndex = 0;
    state.currentArtistIndex = TURN_ORDER[0] ?? 0;
    state.currentWord = getRandomWord();
    state.roundStartTime = Date.now();
    state.roundResolved = false;

    await this.setState(gameId, state);
    return { state };
  }

  async resolveRound(
    gameId: string,
    guesserPlayerIndex: number,
  ): Promise<ResolveRoundResult | null> {
    const state = await this.getState(gameId);
    if (!state) return null;
    if (state.roundResolved) return { scored: false, scoringTeam: null, word: state.currentWord, alreadyResolved: true };

    state.roundResolved = true;

    let scored = false;
    let scoringTeam: TeamId | null = null;

    if (guesserPlayerIndex >= 0 && state.currentArtistIndex !== null) {
      const artist = state.players[state.currentArtistIndex];
      const guesser = state.players[guesserPlayerIndex];

      if (
        artist && guesser &&
        guesser.teamId === artist.teamId &&
        guesser.playerIndex !== artist.playerIndex
      ) {
        state.scores[artist.teamId] = (state.scores[artist.teamId] ?? 0) + 1;
        scored = true;
        scoringTeam = artist.teamId;
      }
    }

    await this.setState(gameId, state);
    return { scored, scoringTeam, word: state.currentWord };
  }

  async nextTurn(gameId: string): Promise<NextTurnResult | null> {
    const state = await this.getState(gameId);
    if (!state) return null;

    const turnOrderLength = TURN_ORDER.length;
    state.currentTurnIndex = (state.currentTurnIndex + 1) % turnOrderLength;
    state.roundNumber += 1;

    if (state.roundNumber > state.config.totalRounds) {
      state.status = 'finished';
      await this.setState(gameId, state);
      return { state, finished: true };
    }

    const lastWord = state.currentWord;
    state.currentArtistIndex = TURN_ORDER[state.currentTurnIndex] ?? 0;
    state.currentWord = getRandomWord(lastWord);
    state.roundStartTime = Date.now();
    state.roundResolved = false;

    await this.setState(gameId, state);
    return { state, finished: false };
  }

  async addChatMessage(gameId: string, message: ChatMessage): Promise<GameState | null> {
    const state = await this.getState(gameId);
    if (!state) return null;
    if (state.chatHistory.length >= 200) {
      state.chatHistory = state.chatHistory.slice(-100);
    }
    state.chatHistory.push(message);
    await this.setState(gameId, state);
    return state;
  }

  async updatePlayerSocket(
    gameId: string,
    playerIndex: PlayerIndex,
    socketId: string,
  ): Promise<GameState | null> {
    const state = await this.getState(gameId);
    if (!state) return null;
    const player = state.players.find(p => p.playerIndex === playerIndex);
    if (player) player.socketId = socketId;
    await this.setState(gameId, state);
    return state;
  }
}
