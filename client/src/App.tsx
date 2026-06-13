import { useState, useEffect } from 'react';
import { useSocket } from './context/SocketContext';
import { useGame } from './context/GameContext';
import { Lobby } from './components/lobby/Lobby';
import { WaitingRoom } from './components/lobby/WaitingRoom';
import { GameBoard } from './components/game/GameBoard';
import type { Screen, PlayerIndex } from './types';

function GameApp() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameId, setGameId] = useState<string | null>(null);
  const { state } = useGame();
  const { socket } = useSocket();

  // Advance screen when game status changes
  useEffect(() => {
    const status = state.gameState?.status;
    if (!status) return;
    if (status === 'waiting' && screen === 'lobby') setScreen('waiting');
    if (status === 'playing' && screen !== 'playing') setScreen('playing');
    if (status === 'finished' && screen !== 'playing') setScreen('playing');
  }, [state.gameState?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive playerIndex — prefer stored, fallback to socket lookup
  const myPlayerIndex: PlayerIndex | null = state.playerIndex ?? (() => {
    if (!socket?.id || !state.gameState) return null;
    const me = state.gameState.players.find(p => p.socketId === socket.id);
    return me?.playerIndex ?? null;
  })();

  function handleJoined(gid: string) {
    setGameId(gid);
    // Screen advances via the useEffect above once game:state arrives
  }

  if (screen === 'lobby') {
    return <Lobby onJoined={handleJoined} />;
  }

  if (screen === 'waiting') {
    return <WaitingRoom gameId={gameId ?? ''} myPlayerIndex={myPlayerIndex} />;
  }

  return <GameBoard myPlayerIndex={myPlayerIndex} />;
}

export default function App() {
  // Providers are in main.tsx — App is purely the screen router
  return <GameApp />;
}
