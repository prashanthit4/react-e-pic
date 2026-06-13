import dotenv from 'dotenv';
import type { GameConfig } from './types/index';

dotenv.config();

function envInt(key: string, fallback: number): number {
  const val = parseInt(process.env[key] ?? '', 10);
  return isNaN(val) ? fallback : val;
}

function envStr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// ─── Server config ────────────────────────────────────────────────────────────

export const PORT = envInt('PORT', 3001);
export const CLIENT_URL = envStr('CLIENT_URL', 'http://localhost:3000');
export const REDIS_URL = envStr('REDIS_URL', 'redis://localhost:6379');
export const MONGODB_URI = envStr('MONGODB_URI', 'mongodb://localhost:27017/pictionary');

// ─── Game config (also sent to clients) ──────────────────────────────────────

const maxPlayers = envInt('GAME_MAX_PLAYERS', 4);
const numTeams = envInt('GAME_NUM_TEAMS', 2);

if (maxPlayers % numTeams !== 0) {
  console.warn(
    `⚠️  GAME_MAX_PLAYERS (${maxPlayers}) is not evenly divisible by GAME_NUM_TEAMS (${numTeams}). ` +
    `Defaulting to ${numTeams} teams of ${Math.floor(maxPlayers / numTeams)}.`
  );
}

export const GAME_CONFIG: GameConfig = {
  maxPlayers,
  numTeams,
  roundDuration: envInt('GAME_ROUND_DURATION', 120),
  totalRounds: envInt('GAME_TOTAL_ROUNDS', 8),
};

/**
 * Generates the turn order array so teams alternate drawing.
 * e.g. 4 players / 2 teams → [0, 2, 1, 3]
 * e.g. 6 players / 2 teams → [0, 3, 1, 4, 2, 5]
 * e.g. 6 players / 3 teams → [0, 2, 4, 1, 3, 5]
 */
export function buildTurnOrder(maxPlayers: number, numTeams: number): number[] {
  const playersPerTeam = Math.floor(maxPlayers / numTeams);
  const order: number[] = [];
  for (let slot = 0; slot < playersPerTeam; slot++) {
    for (let team = 0; team < numTeams; team++) {
      order.push(team * playersPerTeam + slot);
    }
  }
  return order;
}

export const TURN_ORDER = buildTurnOrder(GAME_CONFIG.maxPlayers, GAME_CONFIG.numTeams);
