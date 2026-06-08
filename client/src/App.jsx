import React, { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import { GameProvider, useGame } from './context/GameContext';
import { useSocket } from './context/SocketContext';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';

function GameApp() {
  const [screen, setScreen] = useState('lobby');
  const [gameId, setGameId] = useState(null);
  const { state } = useGame();
  const { socket } = useSocket();

  useEffect(() => {
    const gs = state.gameState;
    if (!gs) return;
    if (gs.status === 'waiting' && screen === 'lobby') {
      setScreen('waiting');
    } else if (gs.status === 'playing' && screen !== 'playing') {
      setScreen('playing');
    } else if (gs.status === 'finished' && screen !== 'playing') {
      setScreen('playing'); // GameOver overlay handles it
    }
  }, [state.gameState?.status, screen]);

  // Derive playerIndex: prefer stored value, fall back to socket lookup
  const myPlayerIndex = state.playerIndex ?? (() => {
    if (!socket?.id || !state.gameState) return null;
    const me = state.gameState.players?.find(p => p.socketId === socket.id);
    return me?.playerIndex ?? null;
  })();

  function handleJoined(gid) {
    setGameId(gid);
    // screen will advance when game:state arrives
  }

  if (screen === 'lobby') {
    return <Lobby onJoined={handleJoined} />;
  }
  if (screen === 'waiting') {
    return <WaitingRoom gameId={gameId} />;
  }
  return <GameBoard myPlayerIndex={myPlayerIndex} />;
}

export default function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <GameApp />
      </GameProvider>
    </SocketProvider>
  );
}
