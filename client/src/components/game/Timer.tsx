import { useGame } from '../../context/GameContext';
import '../../styles/Timer.css';

export function Timer() {
  const { state } = useGame();
  const remaining = Math.max(0, state.timer);
  const total = state.gameState?.config.roundDuration ?? 120;
  const pct = (remaining / total) * 100;

  const isDanger = remaining <= 8;
  const isUrgent = remaining <= 20;
  const barColor = isDanger ? 'var(--red)' : isUrgent ? 'var(--accent)' : 'var(--green)';

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="timer-wrap" style={{ borderColor: barColor }}>
      <div
        className={`timer-display ${isDanger ? 'urgent' : ''}`}
        style={{ color: barColor }}
      >
        ⏱️ {display}
      </div>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}
