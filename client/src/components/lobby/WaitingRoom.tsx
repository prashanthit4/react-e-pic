import { useGame } from '../../context/GameContext';
import { PlayerSlot } from '../ui/PlayerSlot';
import { getTeamColor, getTeamName } from '../ui/TeamBadge';
import type { PlayerIndex } from '../../types';
import '../../styles/WaitingRoom.css';

interface WaitingRoomProps {
  gameId: string;
  myPlayerIndex: PlayerIndex | null;
}

export function WaitingRoom({ gameId, myPlayerIndex }: WaitingRoomProps) {
  const { state } = useGame();
  const gs = state.gameState;
  const players = gs?.players ?? [];
  const config = gs?.config;
  const maxPlayers = config?.maxPlayers ?? 4;
  const numTeams = config?.numTeams ?? 2;
  const playersPerTeam = Math.floor(maxPlayers / numTeams);

  // Build team structure dynamically
  const teams = Array.from({ length: numTeams }, (_, teamId) => {
    const startIdx = teamId * playersPerTeam;
    const slots = Array.from({ length: playersPerTeam }, (_, slotIdx) => {
      const playerIndex = startIdx + slotIdx;
      return players.find(p => p.playerIndex === playerIndex) ?? null;
    });
    return { teamId, slots };
  });

  const joined = players.length;
  const remaining = maxPlayers - joined;

  return (
    <div className="waiting-page">
      <div className="waiting-header">
        <div className="waiting-title">🎨 Pictionary</div>
        <div className="waiting-code-row">
          Share this code with friends:
          <span className="waiting-code-badge">{gameId}</span>
        </div>
        <div className="waiting-count">{joined} / {maxPlayers} players joined</div>
      </div>

      <div className="waiting-teams">
        {teams.map(({ teamId, slots }) => (
          <div
            key={teamId}
            className="waiting-team-card"
            style={{ borderColor: getTeamColor(teamId) }}
          >
            <div
              className="waiting-team-header"
              style={{ background: getTeamColor(teamId) }}
            >
              {getTeamName(teamId)}
            </div>

            {slots.map((player, i) => {
              const playerIndex = teamId * playersPerTeam + i;
              const isArtist = playerIndex === gs?.currentArtistIndex;
              const isMe = playerIndex === myPlayerIndex;

              return player
                ? <PlayerSlot key={playerIndex} filled player={player} isArtist={isArtist} isMe={isMe} />
                : <PlayerSlot key={playerIndex} filled={false} />;
            })}
          </div>
        ))}
      </div>

      {joined < maxPlayers ? (
        <div className="waiting-status animate-pulse">
          ⏳ Waiting for {remaining} more player{remaining !== 1 ? 's' : ''}…
        </div>
      ) : (
        <div className="waiting-starting animate-bounce-in">
          🎉 All players joined! Starting in 2 seconds…
        </div>
      )}

      <div className="waiting-rules">
        {[
          `👥 ${maxPlayers} players`,
          `${numTeams} teams`,
          `🎨 Take turns drawing`,
          `💬 Teammate guesses to score`,
          `⏱️ ${config?.roundDuration ?? 120}s per round`,
          `🏆 ${config?.totalRounds ?? 8} rounds`,
        ].map(rule => (
          <div key={rule} className="waiting-rule-chip">{rule}</div>
        ))}
      </div>
    </div>
  );
}
