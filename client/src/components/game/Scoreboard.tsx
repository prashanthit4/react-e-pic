import { useGame } from '../../context/GameContext';
import { getTeamColor, getTeamLight, getTeamName } from '../ui/TeamBadge';
import type { PlayerIndex } from '../../types';
import '../../styles/Scoreboard.css';

interface ScoreboardProps {
  myPlayerIndex: PlayerIndex | null;
}

export function Scoreboard({ myPlayerIndex }: ScoreboardProps) {
  const { state } = useGame();
  const gs = state.gameState;
  if (!gs) return null;

  const { scores, players, config, currentArtistIndex, roundNumber } = gs;
  const progress = Math.min((roundNumber / config.totalRounds) * 100, 100);

  // Build team list dynamically from config.numTeams
  const teams = Array.from({ length: config.numTeams }, (_, t) => ({
    teamId: t,
    score: scores[t] ?? 0,
    players: players.filter(p => p.teamId === t),
  }));

  return (
    <div className="scoreboard">
      <div className="scoreboard-teams">
        {teams.map(({ teamId, score, players: teamPlayers }) => {
          const color = getTeamColor(teamId);
          const light = getTeamLight(teamId);
          return (
            <div
              key={teamId}
              className="scoreboard-team"
              style={{ borderColor: color }}
            >
              <div className="scoreboard-team-header" style={{ background: color }}>
                {getTeamName(teamId)}
              </div>
              <div className="scoreboard-score">{score}</div>
              <div className="scoreboard-players">
                {teamPlayers.map(p => {
                  const isArtist = p.playerIndex === currentArtistIndex;
                  const isMe = p.playerIndex === myPlayerIndex;
                  return (
                    <div
                      key={p.playerIndex}
                      className="scoreboard-chip"
                      style={{
                        background: isArtist ? color : light,
                        color: isArtist ? 'white' : 'var(--ink)',
                        borderColor: color,
                        fontWeight: isMe ? 800 : 600,
                      }}
                    >
                      {isArtist ? '🎨 ' : ''}{p.name}{isMe ? ' (you)' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="scoreboard-round-box">
        <div className="scoreboard-round-label">
          Round {roundNumber} / {config.totalRounds}
        </div>
        <div className="scoreboard-bar">
          <div className="scoreboard-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
