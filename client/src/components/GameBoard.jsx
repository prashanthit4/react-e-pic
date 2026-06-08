import React, { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import DrawingCanvas from './DrawingCanvas';
import Chat from './Chat';
import Scoreboard from './Scoreboard';
import Timer from './Timer';
import RoundOverlay from './RoundOverlay';
import GameOver from './GameOver';

export default function GameBoard({ myPlayerIndex }) {
  const { state } = useGame();
  const { socket } = useSocket();
  const canvasRef = useRef(null);

  const gs = state.gameState;
  const isArtist = myPlayerIndex != null && myPlayerIndex === gs?.currentArtistIndex;
  const roundResolved = gs?.roundResolved;
  const word = gs?.currentWord;
  const artist = gs?.players?.[gs?.currentArtistIndex];
  const myTeamId = gs?.players?.[myPlayerIndex]?.teamId;
  const isTeammate = myTeamId === artist?.teamId && !isArtist;

  // Wire up remote drawing events to canvas DOM element handlers
  useEffect(() => {
    if (!socket) return;

    const handleMove = (data) => {
      const canvas = document.getElementById('game-canvas');
      if (canvas?.__drawRemote) canvas.__drawRemote(data);
    };
    const handleClear = () => {
      const canvas = document.getElementById('game-canvas');
      if (canvas?.__clearCanvas) canvas.__clearCanvas();
    };
    const handleNewRound = () => {
      // Clear canvas at the start of each new round (game:state triggers re-render)
      setTimeout(() => {
        const canvas = document.getElementById('game-canvas');
        if (canvas?.__clearCanvas) canvas.__clearCanvas();
      }, 100);
    };

    socket.on('draw:move', handleMove);
    socket.on('draw:clear', handleClear);
    socket.on('game:started', handleClear);
    // Clear canvas on each new round state
    socket.on('round:correct', handleNewRound);
    socket.on('round:timeout', handleNewRound);

    return () => {
      socket.off('draw:move', handleMove);
      socket.off('draw:clear', handleClear);
      socket.off('game:started', handleClear);
      socket.off('round:correct', handleNewRound);
      socket.off('round:timeout', handleNewRound);
    };
  }, [socket]);

  if (!gs) return (
    <div style={styles.loading}>
      <div style={styles.loadingText}>🎨 Loading game...</div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.gameInfo}>
          {isArtist ? (
            <div style={styles.wordCard}>
              <span style={styles.drawLabel}>✏️ Your word:</span>
              <span style={styles.wordText}>{word}</span>
            </div>
          ) : (
            <div style={styles.guessPrompt}>
              <div style={styles.artistIndicator}>
                🎨 <strong>{artist?.name || '...'}</strong> is drawing
              </div>
              {isTeammate ? (
                <div style={styles.yourTeam}>👆 Your teammate — guess in the chat!</div>
              ) : (
                <div style={styles.otherTeam}>👀 Opponent's turn — watch and wait</div>
              )}
            </div>
          )}
        </div>
        <Timer />
      </div>

      {/* Main area */}
      <div style={styles.mainArea}>
        <div style={styles.canvasArea}>
          <DrawingCanvas isArtist={isArtist} disabled={roundResolved} />
        </div>
        <div style={styles.sidebar}>
          <Scoreboard myPlayerIndex={myPlayerIndex} />
          <div style={styles.chatWrap}>
            <Chat isArtist={isArtist} myPlayerIndex={myPlayerIndex} />
          </div>
        </div>
      </div>

      <RoundOverlay />
      {state.gameFinished && <GameOver />}
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    gap: '12px',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  gameInfo: { flex: 1, minWidth: 0 },
  wordCard: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--yellow)',
    border: '3px solid var(--ink)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    padding: '10px 20px',
  },
  drawLabel: { fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#664' },
  wordText: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  guessPrompt: { display: 'flex', flexDirection: 'column', gap: 4 },
  artistIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'white',
    border: '2.5px solid var(--ink)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    padding: '8px 16px',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  yourTeam: { fontSize: '0.85rem', color: 'var(--green)', fontWeight: 700, paddingLeft: 4 },
  otherTeam: { fontSize: '0.85rem', color: '#999', fontWeight: 600, paddingLeft: 4 },
  mainArea: {
    flex: 1,
    display: 'flex',
    gap: 12,
    minHeight: 0,
  },
  canvasArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
  },
  sidebar: {
    width: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flexShrink: 0,
    minHeight: 0,
  },
  chatWrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
  },
  loadingText: {
    fontFamily: 'var(--font-display)', fontSize: '2rem',
  },
};
