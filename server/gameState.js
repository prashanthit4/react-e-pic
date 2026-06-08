const { WORDS, ROUND_DURATION, TURN_ORDER } = require('./constants');

class GameStateManager {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  key(gameId) { return `game:${gameId}`; }

  async getState(gameId) {
    try {
      const data = await this.redis.get(this.key(gameId));
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  async setState(gameId, state) {
    try {
      await this.redis.set(this.key(gameId), JSON.stringify(state), { EX: 7200 });
    } catch {
      // in-memory fallback ignores EX option — that's fine
      await this.redis.set(this.key(gameId), JSON.stringify(state));
    }
  }

  createInitialState(gameId) {
    return {
      gameId,
      status: 'waiting',
      players: [],
      scores: { 0: 0, 1: 0 },
      currentTurnIndex: 0,
      currentArtistIndex: null,
      currentWord: null,
      roundStartTime: null,
      roundNumber: 0,
      totalRounds: 8,
      chatHistory: [],
      roundResolved: false,
    };
  }

  getRandomWord(exclude = null) {
    let word;
    do { word = WORDS[Math.floor(Math.random() * WORDS.length)]; }
    while (word === exclude && WORDS.length > 1);
    return word;
  }

  async addPlayer(gameId, playerData) {
    let state = await this.getState(gameId);
    if (!state) state = this.createInitialState(gameId);
    if (state.players.length >= 4) return { error: 'Game is full (4/4 players)' };
    if (state.status !== 'waiting') return { error: 'Game has already started' };

    const playerIndex = state.players.length;
    const teamId = playerIndex < 2 ? 0 : 1;
    const player = { ...playerData, playerIndex, teamId };
    state.players.push(player);
    await this.setState(gameId, state);
    return { player, state };
  }

  async startGame(gameId) {
    const state = await this.getState(gameId);
    if (!state) return { error: 'Game not found' };
    if (state.players.length < 4) return { error: 'Need 4 players to start' };

    state.status = 'playing';
    state.roundNumber = 1;
    state.currentTurnIndex = 0;
    state.currentArtistIndex = TURN_ORDER[0]; // Player index 0 draws first
    state.currentWord = this.getRandomWord();
    state.roundStartTime = Date.now();
    state.roundResolved = false;

    await this.setState(gameId, state);
    return { state };
  }

  async resolveRound(gameId, guesserPlayerIndex) {
    const state = await this.getState(gameId);
    if (!state) return null;
    if (state.roundResolved) return { alreadyResolved: true };

    state.roundResolved = true;

    let scored = false;
    let scoringTeam = null;

    if (guesserPlayerIndex >= 0) {
      const artist = state.players[state.currentArtistIndex];
      const guesser = state.players[guesserPlayerIndex];
      // Only score if guesser is the artist's teammate (same team, different player)
      if (guesser && artist && guesser.teamId === artist.teamId && guesser.playerIndex !== artist.playerIndex) {
        state.scores[artist.teamId] = (state.scores[artist.teamId] || 0) + 1;
        scored = true;
        scoringTeam = artist.teamId;
      }
    }

    await this.setState(gameId, state);
    return { scored, scoringTeam, word: state.currentWord };
  }

  async nextTurn(gameId) {
    const state = await this.getState(gameId);
    if (!state) return null;

    state.currentTurnIndex = (state.currentTurnIndex + 1) % TURN_ORDER.length;
    state.roundNumber += 1;

    if (state.roundNumber > state.totalRounds) {
      state.status = 'finished';
      await this.setState(gameId, state);
      return { state, finished: true };
    }

    const lastWord = state.currentWord;
    state.currentArtistIndex = TURN_ORDER[state.currentTurnIndex];
    state.currentWord = this.getRandomWord(lastWord); // avoid repeating same word
    state.roundStartTime = Date.now();
    state.roundResolved = false;

    await this.setState(gameId, state);
    return { state, finished: false };
  }

  async addChatMessage(gameId, message) {
    const state = await this.getState(gameId);
    if (!state) return null;
    if (state.chatHistory.length >= 200) state.chatHistory = state.chatHistory.slice(-100);
    state.chatHistory.push(message);
    await this.setState(gameId, state);
    return state;
  }

  async updatePlayerSocket(gameId, playerIndex, socketId) {
    const state = await this.getState(gameId);
    if (!state) return null;
    const p = state.players.find(p => p.playerIndex === playerIndex);
    if (p) p.socketId = socketId;
    await this.setState(gameId, state);
    return state;
  }
}

module.exports = GameStateManager;
