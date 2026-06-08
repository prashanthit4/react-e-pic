import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: ['#e63946','#457b9d','#ffbe0b','#2a9d8f','#f4a261'][i % 5],
      delay: Math.random() * 1.5,
      dur: 2.5 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      round: Math.random() > 0.5,
    }))
  );
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2001 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: -20, left: `${p.left}%`,
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.round ? '50%' : 2,
          animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

export default function GameOver() {
  const { state, dispatch } = useGame();
  const data = state.gameFinished;
  if (!data) return null;

  const scores = data.scores || {};
  const players = data.players || [];
  const s0 = scores[0] ?? 0;
  const s1 = scores[1] ?? 0;
  const winner = s0 > s1 ? 0 : s1 > s0 ? 1 : -1;

  const TEAM_COLORS = ['var(--team0)', 'var(--team1)'];
  const TEAM_LIGHT = ['var(--team0-light)', 'var(--team1-light)'];
  const TEAM_NAMES = ['Team Red', 'Team Blue'];

  function playAgain() {
    dispatch({ type: 'RESET' });
    window.location.reload();
  }

  return (
    <>
      <Confetti />
      <div style={styles.backdrop}>
        <div className="animate-bounce-in" style={styles.card}>
          <div style={styles.trophy}>🏆</div>
          <div style={styles.title}>Game Over!</div>

          <div style={{
            ...styles.winBanner,
            background: winner >= 0 ? TEAM_COLORS[winner] : 'var(--green)',
          }}>
            {winner === -1 ? "It's a Tie! 🤝" : `${TEAM_NAMES[winner]} Wins! 🎉`}
          </div>

          <div style={styles.scoreCards}>
            {[0, 1].map(t => (
              <div key={t} style={{
                ...styles.scoreCard,
                border: `3px solid ${TEAM_COLORS[t]}`,
                background: winner === t ? TEAM_LIGHT[t] : 'white',
              }}>
                {winner === t && <div style={styles.crown}>👑</div>}
                <div style={{ ...styles.teamName, color: TEAM_COLORS[t] }}>
                  {TEAM_NAMES[t]}
                </div>
                <div style={styles.bigScore}>{t === 0 ? s0 : s1}</div>
                <div style={styles.playerNames}>
                  {players.filter(p => p.teamId === t).map(p => (
                    <div key={p.playerIndex} style={styles.pName}>{p.name}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '12px 32px' }} onClick={playAgain}>
            🔄 Play Again
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: 20,
  },
  card: {
    background: 'white', border: '4px solid var(--ink)',
    borderRadius: 24, boxShadow: '10px 10px 0 var(--ink)',
    padding: '32px 36px', textAlign: 'center',
    maxWidth: 460, width: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  },
  trophy: { fontSize: '3.5rem' },
  title: { fontFamily: 'var(--font-display)', fontSize: '2.5rem' },
  winBanner: {
    color: 'white', padding: '10px 28px',
    borderRadius: 40, border: '2.5px solid var(--ink)',
    boxShadow: 'var(--shadow)',
    fontFamily: 'var(--font-display)', fontSize: '1.3rem',
  },
  scoreCards: { display: 'flex', gap: 14, width: '100%' },
  scoreCard: {
    flex: 1, borderRadius: 'var(--radius)', padding: '14px 12px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    position: 'relative',
  },
  crown: { position: 'absolute', top: -14, right: -6, fontSize: '1.4rem' },
  teamName: { fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' },
  bigScore: { fontFamily: 'var(--font-display)', fontSize: '3rem', lineHeight: 1 },
  playerNames: { display: 'flex', flexDirection: 'column', gap: 2, width: '100%' },
  pName: { fontSize: '0.82rem', fontWeight: 600, color: '#555', textAlign: 'center' },
};
