import React from 'react';
import { useGame } from '../context/GameContext';

export default function RoundOverlay() {
  const { state } = useGame();
  const event = state.roundEvent;
  if (!event) return null;

  const isCorrect = event.type === 'correct';
  const scores = event.scores || {};

  return (
    <div style={styles.backdrop}>
      <div className="animate-bounce-in" style={{
        ...styles.card,
        borderColor: isCorrect ? 'var(--green)' : 'var(--team0)',
        background: isCorrect ? '#d4f7ea' : '#ffe8e8',
      }}>
        <div style={styles.emoji}>{isCorrect ? '🎉' : '⏰'}</div>
        <div style={styles.title}>{isCorrect ? 'Correct Guess!' : "Time's Up!"}</div>

        {isCorrect && (
          <div style={styles.sub}>
            <strong>{event.guessedBy}</strong> guessed it!<br />
            Team {(event.scoringTeam ?? 0) + 1} scores +1 🏆
          </div>
        )}

        <div style={styles.wordReveal}>
          The word was: <strong>"{event.word}"</strong>
        </div>

        {isCorrect && (
          <div style={styles.scoreRow}>
            <span style={styles.s0}>🔴 Team 1: {scores[0] ?? 0}</span>
            <span style={styles.dot}>·</span>
            <span style={styles.s1}>🔵 Team 2: {scores[1] ?? 0}</span>
          </div>
        )}

        <div style={styles.next}>Next round starting...</div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  card: {
    border: '4px solid', borderRadius: 20,
    boxShadow: '8px 8px 0 var(--ink)',
    padding: '32px 44px', textAlign: 'center',
    maxWidth: 400, width: '100%',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  emoji: { fontSize: '3.5rem', lineHeight: 1 },
  title: { fontFamily: 'var(--font-display)', fontSize: '2.2rem', lineHeight: 1 },
  sub: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.7 },
  wordReveal: { fontSize: '1rem', color: '#555' },
  scoreRow: {
    display: 'flex', gap: 10, justifyContent: 'center',
    alignItems: 'center', fontWeight: 800, fontSize: '1rem',
  },
  s0: { color: 'var(--team0)' },
  s1: { color: 'var(--team1)' },
  dot: { color: '#ccc' },
  next: { color: '#999', fontSize: '0.85rem', fontStyle: 'italic', marginTop: 4 },
};
