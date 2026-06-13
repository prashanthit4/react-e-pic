// ─── Primitives ───────────────────────────────────────────────────────────────

export type TeamId = number;
export type PlayerIndex = number;

// ─── Config ───────────────────────────────────────────────────────────────────

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
export type Scores = Record<number, number>;

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

export interface DrawPoint { x: number; y: number; }

export interface DrawMovePayload {
  from: DrawPoint;
  to: DrawPoint;
  color: string;
  size: number;
  eraser: boolean;
}

// ─── Socket events ────────────────────────────────────────────────────────────

export interface RoundCorrectEvent {
  word: string;
  guessedBy: string;
  scoringTeam: TeamId;
  scores: Scores;
}

export interface RoundTimeoutEvent { word: string; }

export interface GameFinishedEvent {
  scores: Scores;
  players: Player[];
  config: GameConfig;
}

export interface TimerTickEvent { remaining: number; }

// ─── Round event (client-side overlay state) ──────────────────────────────────

export type RoundEventType = 'correct' | 'timeout';

export interface RoundEvent {
  type: RoundEventType;
  word: string;
  guessedBy?: string;
  scoringTeam?: TeamId;
  scores?: Scores;
}

// ─── Game context state ───────────────────────────────────────────────────────

export type Screen = 'lobby' | 'waiting' | 'playing';

export interface GameContextState {
  gameId: string | null;
  playerIndex: PlayerIndex | null;
  playerName: string | null;
  gameState: GameState | null;
  chatMessages: ChatMessage[];
  timer: number;
  roundEvent: RoundEvent | null;
  gameFinished: GameFinishedEvent | null;
  serverConfig: GameConfig | null;
}

// ─── Reducer actions ──────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'SET_GAME_ID'; gameId: string }
  | { type: 'SET_PLAYER'; playerIndex: PlayerIndex; playerName: string }
  | { type: 'GAME_STATE'; state: GameState }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'TIMER_TICK'; remaining: number }
  | { type: 'ROUND_EVENT'; event: RoundEvent }
  | { type: 'GAME_FINISHED'; data: GameFinishedEvent }
  | { type: 'RESET_ROUND_EVENT' }
  | { type: 'SET_SERVER_CONFIG'; config: GameConfig }
  | { type: 'RESET' };
