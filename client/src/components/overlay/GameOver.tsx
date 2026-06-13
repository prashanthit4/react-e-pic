import { useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { Button } from '../ui/Button';
import { getTeamColor, getTeamLight, getTeamName } from '../ui/TeamBadge';
import '../../styles/GameOver.css';

const CONFETTI_COLORS = [
  'var(--team-0)', 'var(--team-1)', 'var(--yellow)', 'var(--green)', 'var(--accent)',
];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        delay: Math.random() * 1.8,
        dur: 2.5 + Math.random() * 2,
        size: 7 + Math.random() * 9,
        round: Math.random() > 0.5,
      })),
    [],
  );

  return (
    <div className="gameover-confetti-layer" aria-hidden>
      {pieces.map(p => (
        <div
          key={p.id}
          className="gameover-confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
            animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

export function GameOver() {
  const { state, dispatch } = useGame();
  const data = state.gameFinished;
  if (!data) return null;

  const { scores, players, config } = data;

  // Find winner(s) — could be a tie
  const maxScore = Math.max(...Object.values(scores));
  const winners = Object.entries(scores)
    .filter(([, s]) => s === maxScore)
    .map(([t]) => Number(t));
  const isTie = winners.length > 1;

  const teams = Array.from({ length: config.numTeams }, (_, t) => ({
    teamId: t,
    score: scores[t] ?? 0,
    players: players.filter(p => p.teamId === t),
    isWinner: winners.includes(t),
  }));

  function playAgain() {
    dispatch({ type: 'RESET' });
    window.location.reload();
  }

  return (
    <>
      <Confetti />
      <div className="gameover-backdrop">
        <div className="gameover-card animate-bounce-in">
          <div className="gameover-trophy">🏆</div>
          <div className="gameover-title">Game Over!</div>

          <div
            className="gameover-winner-banner"
            style={{ background: isTie ? 'var(--green)' : getTeamColor(winners[0]!) }}
          >
            {isTie ? "It's a Tie! 🤝" : `${getTeamName(winners[0]!)} Wins! 🎉`}
          </div>

          <div className="gameover-scores">
            {teams.map(({ teamId, score, players: tp, isWinner }) => (
              <div
                key={teamId}
                className="gameover-score-card"
                style={{
                  borderColor: getTeamColor(teamId),
                  background: isWinner ? getTeamLight(teamId) : 'var(--white)',
                }}
              >
                {isWinner && <div className="gameover-crown">👑</div>}
                <div className="gameover-team-name" style={{ color: getTeamColor(teamId) }}>
                  {getTeamName(teamId)}
                </div>
                <div className="gameover-big-score">{score}</div>
                <div className="gameover-player-list">
                  {tp.map(p => (
                    <div key={p.playerIndex} className="gameover-player-name">{p.name}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button variant="primary" size="lg" onClick={playAgain}>
            🔄 Play Again
          </Button>
        </div>
      </div>
    </>
  );
}
