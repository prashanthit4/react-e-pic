import mongoose, { Schema, Document } from 'mongoose';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const PlayerSchema = new Schema({
  socketId: String,
  name: { type: String, required: true },
  teamId: Number,
  playerIndex: Number,
}, { _id: false });

const RoundSchema = new Schema({
  roundNumber: Number,
  artistIndex: Number,
  word: String,
  guessedBy: String,
  teamScored: Number,
  duration: Number,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// ─── Main schema ──────────────────────────────────────────────────────────────

export interface IGame extends Document {
  gameId: string;
  players: typeof PlayerSchema[];
  rounds: typeof RoundSchema[];
  finalScores: Record<string, number>;
  config: {
    maxPlayers: number;
    numTeams: number;
    roundDuration: number;
    totalRounds: number;
  };
  status: 'waiting' | 'playing' | 'finished';
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

const GameSchema = new Schema<IGame>({
  gameId: { type: String, unique: true, required: true },
  players: [PlayerSchema],
  rounds: [RoundSchema],
  finalScores: { type: Map, of: Number, default: {} },
  config: {
    maxPlayers: Number,
    numTeams: Number,
    roundDuration: Number,
    totalRounds: Number,
  },
  status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export const Game = mongoose.model<IGame>('Game', GameSchema);
