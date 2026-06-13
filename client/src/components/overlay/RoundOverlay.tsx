import { useGame } from '../../context/GameContext';
import { getTeamColor } from '../ui/TeamBadge';
import '../../styles/RoundOverlay.css';

export function RoundOverlay() {
  const { state } = useGame();
  const event = state.roundEvent;
  if (!event) return null;

  const isCorrect = event.type === 'correct';
  const scores = event.scores ?? {};

  return (
    <div className="overlay-backdrop">
      <div className={`overlay-card animate-bounce-in ${isCorrect ? 'correct' : 'timeout'}`}>
        <div className="overlay-emoji">{isCorrect ? '🎉' : '⏰'}</div>
        <div className="overlay-title">{isCorrect ? 'Correct!' : "Time's Up!"}</div>

        {isCorrect && event.guessedBy && (
          <div className="overlay-sub">
            <strong>{event.guessedBy}</strong> guessed it!<br />
            Team {(event.scoringTeam ?? 0) + 1} scores +1 🏆
          </div>
        )}

        <div className="overlay-word">
          The word was: <strong>"{event.word}"</strong>
        </div>

        {isCorrect && (
          <div className="overlay-scores">
            {Object.entries(scores).map(([teamId, score], i) => (
              <>
                {i > 0 && <span key={`dot-${teamId}`} className="overlay-score-dot">·</span>}
                <span key={teamId} style={{ color: getTeamColor(Number(teamId)), fontWeight: 800 }}>
                  Team {Number(teamId) + 1}: {score}
                </span>
              </>
            ))}
          </div>
        )}

        <div className="overlay-next">Next round starting…</div>
      </div>
    </div>
  );
}
