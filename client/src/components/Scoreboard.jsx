import React from 'react';
import { useGame } from '../context/GameContext';

const TEAM_COLORS = ['var(--team0)', 'var(--team1)'];
const TEAM_LIGHT = ['var(--team0-light)', 'var(--team1-light)'];
const TEAM_LABELS = ['🔴 Team Red', '🔵 Team Blue'];

export default function Scoreboard({ myPlayerIndex }) {
  const { state } = useGame();
  const gs = state.gameState;
  if (!gs) return null;

  const { scores = {}, players = [], currentArtistIndex, roundNumber = 1, totalRounds = 8 } = gs;
  const progress = Math.min((roundNumber / totalRounds) * 100, 100);

  return (
    <div style={styles.container}>
      <div style={styles.scores}>
        {[0, 1].map(t => {
          const teamPlayers = players.filter(p => p.teamId === t);
          const score = scores[t] ?? 0;
          return (
            <div key={t} style={{ ...styles.teamCard, borderColor: TEAM_COLORS[t] }}>
              <div style={{ ...styles.teamHeader, background: TEAM_COLORS[t] }}>
                {TEAM_LABELS[t]}
              </div>
              <div style={styles.score}>{score}</div>
              <div style={styles.players}>
                {teamPlayers.map(p => {
                  const isArtist = p.playerIndex === currentArtistIndex;
                  const isMe = p.playerIndex === myPlayerIndex;
                  return (
                    <div key={p.playerIndex} style={{
                      ...styles.chip,
                      background: isArtist ? TEAM_COLORS[t] : TEAM_LIGHT[t],
                      color: isArtist ? 'white' : 'var(--ink)',
                      fontWeight: isMe ? 800 : 600,
                      border: `1.5px solid ${TEAM_COLORS[t]}`,
                    }}>
                      {isArtist ? '🎨 ' : ''}{p.name}{isMe ? ' (you)' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.roundBox}>
        <div style={styles.roundLabel}>Round {roundNumber} / {totalRounds}</div>
        <div style={styles.bar}>
          <div style={{ ...styles.fill, width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 },
  scores: { display: 'flex', gap: 10 },
  teamCard: {
    flex: 1, background: 'white', border: '2.5px solid',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  teamHeader: {
    padding: '7px 12px', color: 'white',
    fontWeight: 800, fontSize: '0.8rem',
    textShadow: '1px 1px 0 rgba(0,0,0,0.15)',
  },
  score: {
    fontFamily: 'var(--font-display)', fontSize: '2.2rem',
    textAlign: 'center', padding: '6px 0 2px', lineHeight: 1,
  },
  players: { padding: '6px', display: 'flex', flexDirection: 'column', gap: 4 },
  chip: {
    padding: '3px 8px', borderRadius: 20,
    fontSize: '0.75rem', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  roundBox: {
    background: 'white', border: '2px solid var(--ink)',
    borderRadius: 10, boxShadow: '3px 3px 0 var(--ink)',
    padding: '8px 12px',
  },
  roundLabel: { fontWeight: 800, fontSize: '0.82rem', marginBottom: 5 },
  bar: { height: 7, background: '#eee', borderRadius: 4, overflow: 'hidden' },
  fill: {
    height: '100%', borderRadius: 4,
    background: 'linear-gradient(90deg, var(--green), var(--yellow))',
    transition: 'width 0.6s ease',
  },
};
