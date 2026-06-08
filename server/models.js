const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  socketId: String,
  name: { type: String, required: true },
  teamId: { type: Number, enum: [0, 1] },
  playerIndex: { type: Number, enum: [0, 1, 2, 3] },
});

const roundSchema = new mongoose.Schema({
  roundNumber: Number,
  artistIndex: Number,
  word: String,
  guessedBy: String,
  teamScored: Number,
  duration: Number, // seconds taken
  timestamp: { type: Date, default: Date.now },
});

const gameSchema = new mongoose.Schema({
  gameId: { type: String, unique: true, required: true },
  players: [playerSchema],
  rounds: [roundSchema],
  finalScores: {
    team0: { type: Number, default: 0 },
    team1: { type: Number, default: 0 },
  },
  status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

const Game = mongoose.model('Game', gameSchema);

module.exports = { Game };
