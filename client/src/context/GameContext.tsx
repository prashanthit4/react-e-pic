import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useSocket } from './SocketContext';
import type {
  GameContextState,
  GameAction,
  GameState,
  ChatMessage,
  RoundCorrectEvent,
  RoundTimeoutEvent,
  GameFinishedEvent,
  TimerTickEvent,
  GameConfig,
  PlayerIndex,
} from '../types';

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: GameContextState = {
  gameId: null,
  playerIndex: null,
  playerName: null,
  gameState: null,
  chatMessages: [],
  timer: 120,
  roundEvent: null,
  gameFinished: null,
  serverConfig: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_GAME_ID':
      return { ...state, gameId: action.gameId };
    case 'SET_PLAYER':
      return { ...state, playerIndex: action.playerIndex, playerName: action.playerName };
    case 'GAME_STATE':
      return { ...state, gameState: action.state };
    case 'CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages.slice(-199), action.message] };
    case 'TIMER_TICK':
      return { ...state, timer: action.remaining };
    case 'ROUND_EVENT':
      return { ...state, roundEvent: action.event };
    case 'GAME_FINISHED':
      return { ...state, gameFinished: action.data };
    case 'RESET_ROUND_EVENT':
      return { ...state, roundEvent: null };
    case 'SET_SERVER_CONFIG':
      return { ...state, serverConfig: action.config };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

// ─── Context value ────────────────────────────────────────────────────────────

interface GameContextValue {
  state: GameContextState;
  dispatch: React.Dispatch<GameAction>;
  joinGame: (opts: { gameId: string; playerName: string }) => void;
  sendChat: (text: string) => void;
  sendDraw: (event: string, data?: unknown) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { socket } = useSocket();

  // Refs to avoid stale closures in event listeners
  const socketIdRef = useRef<string | null>(null);
  const playerIndexRef = useRef<PlayerIndex | null>(null);
  const roundEventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { playerIndexRef.current = state.playerIndex; }, [state.playerIndex]);

  // ─── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => { socketIdRef.current = socket.id ?? null; };
    socketIdRef.current = socket.id ?? null;

    const onGameState = (gs: GameState) => {
      dispatch({ type: 'GAME_STATE', state: gs });
      // Auto-detect own playerIndex on first game:state
      if (playerIndexRef.current === null && socketIdRef.current) {
        const me = gs.players.find(p => p.socketId === socketIdRef.current);
        if (me != null) {
          dispatch({ type: 'SET_PLAYER', playerIndex: me.playerIndex, playerName: me.name });
        }
      }
    };

    const onChatMessage = (msg: ChatMessage) => {
      dispatch({ type: 'CHAT_MESSAGE', message: msg });
    };

    const onTimerTick = ({ remaining }: TimerTickEvent) => {
      dispatch({ type: 'TIMER_TICK', remaining });
    };

    const onRoundCorrect = (data: RoundCorrectEvent) => {
      dispatch({ type: 'ROUND_EVENT', event: { type: 'correct', ...data } });
      if (roundEventTimerRef.current) clearTimeout(roundEventTimerRef.current);
      roundEventTimerRef.current = setTimeout(
        () => dispatch({ type: 'RESET_ROUND_EVENT' }),
        3500,
      );
    };

    const onRoundTimeout = (data: RoundTimeoutEvent) => {
      dispatch({ type: 'ROUND_EVENT', event: { type: 'timeout', word: data.word } });
      if (roundEventTimerRef.current) clearTimeout(roundEventTimerRef.current);
      roundEventTimerRef.current = setTimeout(
        () => dispatch({ type: 'RESET_ROUND_EVENT' }),
        3500,
      );
    };

    const onGameStarted = () => {
      dispatch({ type: 'TIMER_TICK', remaining: state.gameState?.config.roundDuration ?? 120 });
    };

    const onGameFinished = (data: GameFinishedEvent) => {
      dispatch({ type: 'GAME_FINISHED', data });
    };

    const onServerConfig = (config: GameConfig) => {
      dispatch({ type: 'SET_SERVER_CONFIG', config });
    };

    socket.on('connect', onConnect);
    socket.on('game:state', onGameState);
    socket.on('chat:message', onChatMessage);
    socket.on('timer:tick', onTimerTick);
    socket.on('round:correct', onRoundCorrect);
    socket.on('round:timeout', onRoundTimeout);
    socket.on('game:started', onGameStarted);
    socket.on('game:finished', onGameFinished);
    socket.on('server:config', onServerConfig);

    return () => {
      socket.off('connect', onConnect);
      socket.off('game:state', onGameState);
      socket.off('chat:message', onChatMessage);
      socket.off('timer:tick', onTimerTick);
      socket.off('round:correct', onRoundCorrect);
      socket.off('round:timeout', onRoundTimeout);
      socket.off('game:started', onGameStarted);
      socket.off('game:finished', onGameFinished);
      socket.off('server:config', onServerConfig);
    };
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actions ──────────────────────────────────────────────────────────────
  const joinGame = useCallback(({ gameId, playerName }: { gameId: string; playerName: string }) => {
    if (!socket) return;
    dispatch({ type: 'SET_GAME_ID', gameId });
    dispatch({ type: 'SET_PLAYER', playerIndex: null as unknown as PlayerIndex, playerName });
    socket.emit('game:join', { gameId, playerName });
  }, [socket]);

  const sendChat = useCallback((text: string) => {
    socket?.emit('chat:send', { text });
  }, [socket]);

  const sendDraw = useCallback((event: string, data?: unknown) => {
    socket?.emit(event, data);
  }, [socket]);

  return (
    <GameContext value={{ state, dispatch, joinGame, sendChat, sendDraw }}>
      {children}
    </GameContext>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within <GameProvider>');
  return ctx;
}
