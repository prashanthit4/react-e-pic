import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';

const GameContext = createContext(null);

const initialState = {
  gameId: null,
  playerIndex: null,
  playerName: null,
  gameState: null,
  chatMessages: [],
  timer: 120,
  roundEvent: null,
  gameFinished: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_GAME_ID': return { ...state, gameId: action.gameId };
    case 'SET_PLAYER': return { ...state, playerIndex: action.playerIndex, playerName: action.playerName };
    case 'GAME_STATE': {
      // Auto-detect playerIndex from socket on first game state if not yet set
      return { ...state, gameState: action.state, roundEvent: null };
    }
    case 'CHAT_MESSAGE': return { ...state, chatMessages: [...state.chatMessages.slice(-199), action.message] };
    case 'TIMER_TICK': return { ...state, timer: action.remaining };
    case 'ROUND_EVENT': return { ...state, roundEvent: action.event };
    case 'GAME_FINISHED': return { ...state, gameFinished: action.data };
    case 'RESET_ROUND_EVENT': return { ...state, roundEvent: null };
    case 'RESET': return { ...initialState };
    default: return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { socket } = useSocket();
  const roundEventTimer = useRef(null);
  const socketIdRef = useRef(null);
  const playerIndexRef = useRef(null);

  // Keep refs in sync for use in callbacks
  useEffect(() => { playerIndexRef.current = state.playerIndex; }, [state.playerIndex]);

  useEffect(() => {
    if (!socket) return;

    socketIdRef.current = socket.id;
    socket.on('connect', () => { socketIdRef.current = socket.id; });

    socket.on('game:state', (gs) => {
      dispatch({ type: 'GAME_STATE', state: gs });
      // Auto-resolve playerIndex from socketId if not yet set
      if (playerIndexRef.current === null && socketIdRef.current) {
        const me = gs.players?.find(p => p.socketId === socketIdRef.current);
        if (me != null) {
          dispatch({ type: 'SET_PLAYER', playerIndex: me.playerIndex, playerName: me.name });
        }
      }
    });

    socket.on('chat:message', (msg) => {
      dispatch({ type: 'CHAT_MESSAGE', message: msg });
    });

    socket.on('timer:tick', ({ remaining }) => {
      dispatch({ type: 'TIMER_TICK', remaining });
    });

    socket.on('round:correct', (data) => {
      dispatch({ type: 'ROUND_EVENT', event: { type: 'correct', ...data } });
      clearTimeout(roundEventTimer.current);
      roundEventTimer.current = setTimeout(() => dispatch({ type: 'RESET_ROUND_EVENT' }), 3500);
    });

    socket.on('round:timeout', (data) => {
      dispatch({ type: 'ROUND_EVENT', event: { type: 'timeout', ...data } });
      clearTimeout(roundEventTimer.current);
      roundEventTimer.current = setTimeout(() => dispatch({ type: 'RESET_ROUND_EVENT' }), 3500);
    });

    socket.on('game:started', () => {
      dispatch({ type: 'TIMER_TICK', remaining: 120 });
    });

    socket.on('game:finished', (data) => {
      dispatch({ type: 'GAME_FINISHED', data });
    });

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
    });

    return () => {
      socket.off('connect');
      socket.off('game:state');
      socket.off('chat:message');
      socket.off('timer:tick');
      socket.off('round:correct');
      socket.off('round:timeout');
      socket.off('game:started');
      socket.off('game:finished');
      socket.off('error');
    };
  }, [socket]);

  const joinGame = useCallback(({ gameId, playerName }) => {
    if (!socket) return;
    dispatch({ type: 'SET_GAME_ID', gameId });
    dispatch({ type: 'SET_PLAYER', playerIndex: null, playerName });
    socket.emit('game:join', { gameId, playerName });
  }, [socket]);

  const sendChat = useCallback((text) => {
    socket?.emit('chat:send', { text });
  }, [socket]);

  const sendDraw = useCallback((event, data) => {
    socket?.emit(event, data);
  }, [socket]);

  return (
    <GameContext.Provider value={{ state, dispatch, joinGame, sendChat, sendDraw }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
