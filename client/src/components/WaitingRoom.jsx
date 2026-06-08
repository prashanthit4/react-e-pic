import React from 'react';
import { useGame } from '../context/GameContext';

const TEAM_COLORS = ['var(--team0)', 'var(--team1)'];
const TEAM_LIGHT = ['var(--team0-light)', 'var(--team1-light)'];
const TEAM_NAMES = ['🔴 Team Red', '🔵 Team Blue'];

export default function WaitingRoom({ gameId }) {
  const { state } = useGame();
  const players = state.gameState?.players || [];

  // Slot indices: Team 0 = playerIndex 0,1 | Team 1 = playerIndex 2,3
  const slots = Array.from({ length: 4 }, (_, i) => players.find(p => p.playerIndex === i) || null);
  const teamSlots = [
    { teamId: 0, players: [slots[0], slots[1]] },
    { teamId: 1, players: [slots[2], slots[3]] },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.title}>🎨 Pictionary</div>
        <div style={styles.codeRow}>
          Share this code with friends:
          <span style={styles.code}>{gameId}</span>
        </div>
        <div style={styles.count}>{players.length} / 4 players joined</div>
      </div>

      <div style={styles.teams}>
        {teamSlots.map(({ teamId, players: tp }) => (
          <div key={teamId} style={{ ...styles.teamCard, borderColor: TEAM_COLORS[teamId] }}>
            <div style={{ ...styles.teamHeader, background: TEAM_COLORS[teamId] }}>
              {TEAM_NAMES[teamId]}
            </div>
            {tp.map((p, i) => (
              <div
                key={i}
                className={p ? 'animate-slide-up' : ''}
                style={{
                  ...styles.slot,
                  background: p ? TEAM_LIGHT[teamId] : 'var(--cream)',
                  border: `2px ${p ? 'solid' : 'dashed'} ${TEAM_COLORS[teamId]}`,
                }}
              >
                {p ? (
                  <>
                    <div style={{ ...styles.avatar, background: TEAM_COLORS[teamId] }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={styles.pName}>{p.name}</div>
                      <div style={styles.pRole}>Player {p.playerIndex + 1}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.emptyCircle}>?</div>
                    <div style={styles.emptyLabel}>Waiting...</div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {players.length < 4 ? (
        <div className="animate-pulse" style={styles.waitMsg}>
          ⏳ Waiting for {4 - players.length} more player{4 - players.length !== 1 ? 's' : ''}...
        </div>
      ) : (
        <div className="animate-bounce-in" style={styles.startMsg}>
          🎉 All players joined! Game starting in 2 seconds...
        </div>
      )}

      <div style={styles.rules}>
        {['👥 4 players, 2 teams', '🎨 Take turns drawing', '💬 Teammate guesses', '⏱️ 2 min per round', '🏆 8 rounds total'].map(r => (
          <div key={r} style={styles.ruleChip}>{r}</div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 28,
  },
  header: { textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)',
    textShadow: '4px 4px 0 var(--accent)',
  },
  codeRow: { fontWeight: 700, fontSize: '0.95rem', color: '#555', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  code: {
    fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: 4,
    background: 'var(--yellow)', padding: '2px 14px', borderRadius: 8,
    border: '2px solid var(--ink)',
  },
  count: { color: '#888', fontWeight: 600, fontSize: '0.9rem' },
  teams: { display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' },
  teamCard: {
    background: 'white', border: '3px solid', borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)', overflow: 'hidden', minWidth: 220,
  },
  teamHeader: {
    padding: '10px 18px', color: 'white',
    fontFamily: 'var(--font-display)', fontSize: '1.1rem',
  },
  slot: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '8px', borderRadius: 10, padding: '12px 14px',
  },
  avatar: {
    width: 38, height: 38, borderRadius: '50%', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontSize: '1.2rem', flexShrink: 0,
  },
  pName: { fontWeight: 800, fontSize: '0.95rem' },
  pRole: { fontSize: '0.72rem', color: '#666' },
  emptyCircle: {
    width: 38, height: 38, borderRadius: '50%', border: '2px dashed #ccc',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#ccc', fontSize: '1.1rem', flexShrink: 0,
  },
  emptyLabel: { color: '#bbb', fontStyle: 'italic', fontWeight: 600, fontSize: '0.9rem' },
  waitMsg: {
    background: 'white', border: '2px solid var(--ink)',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
    padding: '12px 24px', fontWeight: 700, color: '#555',
  },
  startMsg: {
    background: 'var(--green)', color: 'white',
    padding: '14px 28px', borderRadius: 'var(--radius)',
    border: '2.5px solid var(--ink)', boxShadow: 'var(--shadow)',
    fontFamily: 'var(--font-display)', fontSize: '1.2rem',
  },
  rules: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  ruleChip: {
    background: 'white', border: '2px solid var(--ink)',
    borderRadius: 20, boxShadow: '2px 2px 0 var(--ink)',
    padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700,
  },
};
