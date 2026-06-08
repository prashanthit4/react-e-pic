import React from 'react';
import { useGame } from '../context/GameContext';

export default function Timer() {
  const { state } = useGame();
  const remaining = Math.max(0, state.timer ?? 120);
  const pct = (remaining / 120) * 100;
  const isUrgent = remaining <= 20;
  const isDanger = remaining <= 8;

  const barColor = isDanger ? 'var(--team0)' : isUrgent ? 'var(--accent)' : 'var(--green)';
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div style={{ ...styles.wrap, borderColor: barColor }}>
      <div style={{
        ...styles.time, color: barColor,
        ...(isDanger ? { animation: 'pulse 0.6s ease-in-out infinite' } : {}),
      }}>
        ⏱️ {display}
      </div>
      <div style={styles.track}>
        <div style={{ ...styles.fill, width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    background: 'white', border: '2.5px solid', borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)', padding: '8px 16px',
    display: 'flex', flexDirection: 'column', gap: 6,
    transition: 'border-color 0.4s', minWidth: 130, flexShrink: 0,
  },
  time: {
    fontFamily: 'var(--font-display)', fontSize: '1.5rem',
    textAlign: 'center', lineHeight: 1, transition: 'color 0.4s',
  },
  track: { height: 7, background: '#eee', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, transition: 'width 1s linear, background 0.4s' },
};
