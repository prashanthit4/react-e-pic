// ─── Primitives ───────────────────────────────────────────────────────────────

export type TeamId = number;        // 0-based, up to NUM_TEAMS-1
export type PlayerIndex = number;   // 0-based, up to MAX_PLAYERS-1

// ─── Config (derived from env, passed to clients via game state) ──────────────

export interface GameConfig {
  maxPlayers: number;
  numTeams: number;
  roundDuration: number;
  totalRounds: number;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  socketId: string;
  name: string;
  playerIndex: PlayerIndex;
  teamId: TeamId;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type GameStatus = 'waiting' | 'playing' | 'finished';

export type Scores = Record<number, number>; // teamId → score

export interface GameState {
  gameId: string;
  status: GameStatus;
  players: Player[];
  scores: Scores;
  config: GameConfig;
  currentTurnIndex: number;
  currentArtistIndex: PlayerIndex | null;
  currentWord: string | null;
  roundStartTime: number | null;
  roundNumber: number;
  chatHistory: ChatMessage[];
  roundResolved: boolean;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageType = 'chat' | 'system';

export interface ChatMessage {
  type: MessageType;
  playerId?: PlayerIndex;
  playerName?: string;
  teamId?: TeamId;
  text: string;
  timestamp: number;
  correct?: boolean;
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawMovePayload {
  from: DrawPoint;
  to: DrawPoint;
  color: string;
  size: number;
  eraser: boolean;
}

export interface DrawStartPayload {
  x: number;
  y: number;
  color: string;
  size: number;
  tool: string;
}

// ─── Socket payloads ─────────────────────────────────────────────────────────

export interface JoinPayload {
  gameId: string;
  playerName: string;
}

export interface CreateGamePayload {
  playerCount: number; // player-selected, validated against server env max
}

export interface ReconnectPayload {
  gameId: string;
  playerIndex: PlayerIndex;
}

export interface ChatSendPayload {
  text: string;
}

// ─── Server → Client events ───────────────────────────────────────────────────

export interface RoundCorrectEvent {
  word: string;
  guessedBy: string;
  scoringTeam: TeamId;
  scores: Scores;
}

export interface RoundTimeoutEvent {
  word: string;
}

export interface GameFinishedEvent {
  scores: Scores;
  players: Player[];
  config: GameConfig;
}

export interface TimerTickEvent {
  remaining: number;
}

export interface ServerConfigEvent {
  config: GameConfig;
}

// ─── Internal results ─────────────────────────────────────────────────────────

export type AddPlayerResult =
  | { error: string }
  | { player: Player; state: GameState };

export interface ResolveRoundResult {
  scored: boolean;
  scoringTeam: TeamId | null;
  word: string | null;
  alreadyResolved?: boolean;
}

export interface NextTurnResult {
  state: GameState;
  finished: boolean;
}
