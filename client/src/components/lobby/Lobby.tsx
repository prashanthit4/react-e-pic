import { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import type { GameConfig } from '../../types';
import '../../styles/Lobby.css';

interface LobbyProps {
  onJoined: (gameId: string) => void;
}

type Mode = 'home' | 'create' | 'join';

// Valid player counts the host can pick — server env is the cap
const PLAYER_COUNT_OPTIONS = [2, 4, 6, 8];

export function Lobby({ onJoined }: LobbyProps) {
  const { connected } = useSocket();
  const { joinGame } = useGame();

  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [mode, setMode] = useState<Mode>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [selectedPlayerCount, setSelectedPlayerCount] = useState(4);
  const [serverConfig, setServerConfig] = useState<GameConfig | null>(null);

  // Fetch server config to know the actual max
  useState(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: GameConfig) => setServerConfig(cfg))
      .catch(() => { /* silently fail — show all options */ });
  });

  const maxAllowed = serverConfig?.maxPlayers ?? 8;
  const availableCounts = PLAYER_COUNT_OPTIONS.filter(n => n <= maxAllowed);

  function validate(): boolean {
    if (!name.trim()) { setError('Please enter your name!'); return false; }
    return true;
  }

  async function handleCreate() {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game/create', { method: 'POST' });
      if (!res.ok) throw new Error('Server error');
      const data: { gameId: string; config: GameConfig } = await res.json();
      setCreatedCode(data.gameId);
      joinGame({ gameId: data.gameId, playerName: name.trim() });
      onJoined(data.gameId);
    } catch {
      setError('Could not create game — is the server running on :3001?');
    } finally {
      setLoading(false);
    }
  }

  function handleJoin() {
    if (!validate()) return;
    if (gameId.trim().length < 6) { setError('Enter a valid game code.'); return; }
    const gid = gameId.trim().toUpperCase();
    joinGame({ gameId: gid, playerName: name.trim() });
    onJoined(gid);
  }

  function goBack() { setMode('home'); setError(''); setCreatedCode(''); }

  return (
    <div className="lobby-page">
      {/* Hero */}
      <div className="lobby-hero">
        <div className="lobby-logo">🎨 Pictionary</div>
        <div className="lobby-tagline">Draw it. Guess it. Win it.</div>
      </div>

      <Card className="lobby-card">
        {/* ── Home ─────────────────────────────────── */}
        {mode === 'home' && (
          <>
            <div className="lobby-section-title">Enter your name</div>
            <Input
              label="Your nickname"
              placeholder="e.g. Alex"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && setMode('create')}
              maxLength={20}
              autoFocus
            />
            {error && <div className="lobby-error">{error}</div>}
            <div className="lobby-btn-row">
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onClick={() => { if (!name.trim()) { setError('Enter a name first!'); return; } setMode('create'); setError(''); }}
              >
                ✨ Create
              </Button>
              <Button
                variant="ghost"
                style={{ flex: 1 }}
                onClick={() => { if (!name.trim()) { setError('Enter a name first!'); return; } setMode('join'); setError(''); }}
              >
                🔗 Join
              </Button>
            </div>
          </>
        )}

        {/* ── Create ───────────────────────────────── */}
        {mode === 'create' && (
          <>
            <button className="lobby-back-btn" onClick={goBack}>← Back</button>
            <div className="lobby-section-title">Create a Game</div>
            <div className="lobby-name-hint">Playing as: <strong>{name}</strong></div>

            {/* Player count selector */}
            <div className="lobby-player-count">
              <label>Number of Players</label>
              <div className="lobby-count-row">
                {availableCounts.map(n => (
                  <button
                    key={n}
                    className={`lobby-count-btn ${selectedPlayerCount === n ? 'selected' : ''}`}
                    onClick={() => setSelectedPlayerCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="lobby-error">{error}</div>}

            <Button
              variant="primary"
              style={{ width: '100%' }}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? '⏳ Creating…' : '🎮 Create & Join'}
            </Button>

            {createdCode && (
              <div className="lobby-code-box">
                <div className="lobby-code-label">Share this code</div>
                <div className="lobby-code-value">{createdCode}</div>
                <div className="lobby-code-hint">
                  Waiting for {selectedPlayerCount - 1} more player{selectedPlayerCount - 1 !== 1 ? 's' : ''}…
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Join ─────────────────────────────────── */}
        {mode === 'join' && (
          <>
            <button className="lobby-back-btn" onClick={goBack}>← Back</button>
            <div className="lobby-section-title">Join a Game</div>
            <div className="lobby-name-hint">Playing as: <strong>{name}</strong></div>

            <Input
              label="Game Code"
              placeholder="XXXXXXXX"
              value={gameId}
              onChange={e => { setGameId(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={8}
              className="lobby-code-input"
              autoFocus
            />

            {error && <div className="lobby-error">{error}</div>}

            <Button variant="primary" style={{ width: '100%' }} onClick={handleJoin}>
              🚀 Join Game
            </Button>
          </>
        )}
      </Card>

      <div className="lobby-info">
        <span>👥 {selectedPlayerCount} players</span>
        <span className="lobby-dot">·</span>
        <span>🏆 Teams</span>
        <span className="lobby-dot">·</span>
        <span>⏱️ Timed rounds</span>
      </div>

      {!connected && (
        <div className="lobby-offline">⚠️ Connecting to server…</div>
      )}
    </div>
  );
}
