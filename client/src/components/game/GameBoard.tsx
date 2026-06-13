import { useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useSocket } from '../../context/SocketContext';
import { DrawingCanvas } from '../canvas/DrawingCanvas';
import { Chat } from '../chat/Chat';
import { Scoreboard } from './Scoreboard';
import { Timer } from './Timer';
import { RoundOverlay } from '../overlay/RoundOverlay';
import { GameOver } from '../overlay/GameOver';
import { getTeamName } from '../ui/TeamBadge';
import type { DrawMovePayload, PlayerIndex } from '../../types';
import '../../styles/GameBoard.css';

interface GameBoardProps {
  myPlayerIndex: PlayerIndex | null;
}

export function GameBoard({ myPlayerIndex }: GameBoardProps) {
  const { state } = useGame();
  const { socket } = useSocket();
  const gs = state.gameState;

  const isArtist = myPlayerIndex != null && myPlayerIndex === gs?.currentArtistIndex;
  const artist = gs?.currentArtistIndex != null ? gs.players[gs.currentArtistIndex] : null;
  const myPlayer = myPlayerIndex != null ? gs?.players[myPlayerIndex] : null;
  const isTeammate = !isArtist && myPlayer != null && artist != null && myPlayer.teamId === artist.teamId;

  // Wire remote draw events directly to canvas DOM handlers
  useEffect(() => {
    if (!socket) return;

    const onDrawMove = (data: DrawMovePayload) => {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
      canvas?.__drawRemote?.(data);
    };

    const onDrawClear = () => {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
      canvas?.__clearCanvas?.();
    };

    const onNewRound = () => {
      setTimeout(() => {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
        canvas?.__clearCanvas?.();
      }, 150);
    };

    socket.on('draw:move', onDrawMove);
    socket.on('draw:clear', onDrawClear);
    socket.on('game:started', onDrawClear);
    socket.on('round:correct', onNewRound);
    socket.on('round:timeout', onNewRound);

    return () => {
      socket.off('draw:move', onDrawMove);
      socket.off('draw:clear', onDrawClear);
      socket.off('game:started', onDrawClear);
      socket.off('round:correct', onNewRound);
      socket.off('round:timeout', onNewRound);
    };
  }, [socket]);

  if (!gs) {
    return (
      <div className="gameboard-loading">
        <span className="animate-spin">🎨</span> Loading game…
      </div>
    );
  }

  return (
    <div className="gameboard">
      {/* Top bar */}
      <div className="gameboard-topbar">
        <div className="gameboard-game-info">
          {isArtist ? (
            <div className="gameboard-word-card">
              <span className="gameboard-word-label">✏️ Your word:</span>
              <span className="gameboard-word-text">{gs.currentWord}</span>
            </div>
          ) : (
            <div className="gameboard-guess-prompt">
              <div className="gameboard-artist-indicator">
                🎨 <strong>{artist?.name ?? '…'}</strong> is drawing
                {artist && (
                  <span style={{ marginLeft: 6, fontSize: '0.8rem', fontWeight: 600, color: '#888' }}>
                    ({getTeamName(artist.teamId)})
                  </span>
                )}
              </div>
              <div className={`gameboard-team-hint ${isTeammate ? 'is-teammate' : 'is-opponent'}`}>
                {isTeammate
                  ? '👆 Your teammate: guess in the chat!'
                  : "👀 Opponent's turn: watch and wait"}
              </div>
            </div>
          )}
        </div>
        <Timer />
      </div>

      {/* Main area */}
      <div className="gameboard-main">
        <div className="gameboard-canvas-area">
          <DrawingCanvas isArtist={isArtist} disabled={gs.roundResolved} />
        </div>

        <div className="gameboard-sidebar">
          <Scoreboard myPlayerIndex={myPlayerIndex} />
          <div className="gameboard-chat-wrap">
            <Chat isArtist={isArtist} myPlayerIndex={myPlayerIndex} />
          </div>
        </div>
      </div>

      {/* Overlays */}
      <RoundOverlay />
      {state.gameFinished && <GameOver />}
    </div>
  );
}
