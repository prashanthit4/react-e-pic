import type { TeamId } from '../../types';

// Colours for up to 4 teams — extend if needed
const TEAM_COLORS: Record<number, string> = {
  0: 'var(--team-0)',
  1: 'var(--team-1)',
  2: 'var(--team-2)',
  3: 'var(--team-3)',
};

const TEAM_LIGHT: Record<number, string> = {
  0: 'var(--team-0-light)',
  1: 'var(--team-1-light)',
  2: 'var(--team-2-light)',
  3: 'var(--team-3-light)',
};

const TEAM_EMOJIS: Record<number, string> = { 0: '🔴', 1: '🔵', 2: '🟢', 3: '🟣' };

interface TeamBadgeProps {
  teamId: TeamId;
  size?: 'sm' | 'md';
}

export function TeamBadge({ teamId, size = 'md' }: TeamBadgeProps) {
  const color = TEAM_COLORS[teamId] ?? 'var(--ink)';
  const fontSize = size === 'sm' ? '0.72rem' : '0.82rem';
  return (
    <span className="badge" style={{ color, borderColor: color, fontSize }}>
      {TEAM_EMOJIS[teamId] ?? '⚫'} Team {teamId + 1}
    </span>
  );
}

// Helpers exported for use elsewhere
export { TEAM_COLORS, TEAM_LIGHT, TEAM_EMOJIS };

export function getTeamColor(teamId: TeamId): string {
  return TEAM_COLORS[teamId] ?? 'var(--ink)';
}

export function getTeamLight(teamId: TeamId): string {
  return TEAM_LIGHT[teamId] ?? '#eee';
}

export function getTeamName(teamId: TeamId): string {
  return `${TEAM_EMOJIS[teamId] ?? '⚫'} Team ${teamId + 1}`;
}
