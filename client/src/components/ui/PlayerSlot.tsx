import type { Player } from '../../types';
import { getTeamColor, getTeamLight } from './TeamBadge';

interface FilledSlotProps {
  player: Player;
  isArtist?: boolean;
  isMe?: boolean;
}

interface EmptySlotProps {
  filled: false;
}

type PlayerSlotProps = ({ filled: true } & FilledSlotProps) | EmptySlotProps;

export function PlayerSlot(props: PlayerSlotProps) {
  if (!props.filled) {
    return (
      <div className="waiting-slot" style={{ background: 'var(--cream)', border: '2px dashed #ccc' }}>
        <div className="waiting-empty-circle">?</div>
        <span className="waiting-empty-label">Waiting…</span>
      </div>
    );
  }

  const { player, isArtist = false, isMe = false } = props;
  const color = getTeamColor(player.teamId);
  const light = getTeamLight(player.teamId);

  return (
    <div
      className="waiting-slot animate-slide-up"
      style={{
        background: isArtist ? color : light,
        border: `2px solid ${color}`,
      }}
    >
      <div className="waiting-avatar" style={{ background: color }}>
        {player.name[0]?.toUpperCase()}
      </div>
      <div>
        <div className="waiting-player-name">
          {isArtist ? '🎨 ' : ''}{player.name}{isMe ? ' (you)' : ''}
        </div>
        <div className="waiting-player-role">Player {player.playerIndex + 1}</div>
      </div>
    </div>
  );
}
