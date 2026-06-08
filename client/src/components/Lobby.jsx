import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

export default function Lobby({ onJoined }) {
  const { connected } = useSocket();
  const { joinGame } = useGame();
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [mode, setMode] = useState('home'); // home | create | join
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter your name!'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/game/create', { method: 'POST' });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setCreatedCode(data.gameId);
      joinGame({ gameId: data.gameId, playerName: name.trim() });
      onJoined(data.gameId);
    } catch (e) {
      setError('Could not create game — is the server running on :3001?');
    }
    setLoading(false);
  }

  function handleJoin() {
    if (!name.trim()) { setError('Please enter your name!'); return; }
    if (gameId.trim().length < 6) { setError('Please enter a valid game code.'); return; }
    const gid = gameId.trim().toUpperCase();
    joinGame({ gameId: gid, playerName: name.trim() });
    onJoined(gid);
  }

  function handleKey(e) {
    if (e.key === 'Enter') mode === 'create' ? handleCreate() : handleJoin();
  }

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <div style={s.logo}>🎨 Pictionary</div>
        <div style={s.tagline}>Draw it. Guess it. Win it.</div>
      </div>

      <div className="card" style={s.card}>
        {mode === 'home' && (
          <>
            <div style={s.sectionTitle}>Enter your name to start</div>
            <input
              style={s.input}
              placeholder="Your nickname..."
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              maxLength={20}
              autoFocus
            />
            {error && <div style={s.error}>{error}</div>}
            <div style={s.btnRow}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { if (!name.trim()) { setError('Enter a name first!'); return; } setMode('create'); setError(''); }}>
                ✨ Create Game
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { if (!name.trim()) { setError('Enter a name first!'); return; } setMode('join'); setError(''); }}>
                🔗 Join Game
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <button style={s.back} onClick={() => { setMode('home'); setError(''); setCreatedCode(''); }}>← Back</button>
            <div style={s.sectionTitle}>Create a New Game</div>
            <div style={s.nameDisplay}>Playing as: <strong>{name}</strong></div>
            {error && <div style={s.error}>{error}</div>}
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.05rem' }} onClick={handleCreate} disabled={loading}>
              {loading ? '⏳ Creating...' : '🎮 Create & Join'}
            </button>
            {createdCode && (
              <div style={s.codeBox}>
                <div style={s.codeLabel}>Share this code:</div>
                <div style={s.codeValue}>{createdCode}</div>
                <div style={s.codeHint}>Waiting for 3 more players to join...</div>
              </div>
            )}
          </>
        )}

        {mode === 'join' && (
          <>
            <button style={s.back} onClick={() => { setMode('home'); setError(''); }}>← Back</button>
            <div style={s.sectionTitle}>Join a Game</div>
            <div style={s.nameDisplay}>Playing as: <strong>{name}</strong></div>
            <input
              style={{ ...s.input, textTransform: 'uppercase', letterSpacing: 6, fontWeight: 800, textAlign: 'center' }}
              placeholder="GAME CODE"
              value={gameId}
              onChange={e => { setGameId(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
              maxLength={8}
              autoFocus
            />
            {error && <div style={s.error}>{error}</div>}
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.05rem' }} onClick={handleJoin}>
              🚀 Join Game
            </button>
          </>
        )}
      </div>

      <div style={s.info}>
        <span>👥 4 players</span><span style={s.dot}>·</span>
        <span>🔴🔵 2 teams</span><span style={s.dot}>·</span>
        <span>⏱️ 2 min rounds</span><span style={s.dot}>·</span>
        <span>🏆 8 rounds</span>
      </div>

      {!connected && (
        <div style={s.offline}>⚠️ Connecting to server...</div>
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24,
  },
  hero: { textAlign: 'center' },
  logo: {
    fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 9vw, 5.5rem)',
    lineHeight: 1, textShadow: '5px 5px 0 var(--accent)',
  },
  tagline: { fontWeight: 700, fontSize: '1rem', color: '#777', marginTop: 8, letterSpacing: 0.5 },
  card: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '1.4rem' },
  nameDisplay: { fontSize: '0.9rem', color: '#666', fontWeight: 600 },
  input: {
    padding: '12px 16px', border: '2.5px solid var(--ink)',
    borderRadius: 'var(--radius)', fontSize: '1rem',
    fontFamily: 'var(--font-body)', fontWeight: 700,
    background: 'var(--cream)', width: '100%',
  },
  btnRow: { display: 'flex', gap: 10 },
  error: {
    background: '#ffe0e0', border: '2px solid var(--team0)',
    borderRadius: 8, padding: '8px 12px',
    fontSize: '0.88rem', fontWeight: 700, color: 'var(--team0)',
  },
  back: {
    background: 'none', border: 'none', fontWeight: 800,
    cursor: 'pointer', color: '#888', fontSize: '0.88rem', padding: 0, alignSelf: 'flex-start',
  },
  codeBox: {
    textAlign: 'center', background: 'var(--cream)',
    border: '2px dashed var(--ink)', borderRadius: 10, padding: '12px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  codeLabel: { fontSize: '0.8rem', fontWeight: 700, color: '#777', textTransform: 'uppercase' },
  codeValue: {
    fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: 6,
    color: 'var(--ink)',
  },
  codeHint: { fontSize: '0.78rem', color: '#999', fontStyle: 'italic' },
  info: {
    display: 'flex', gap: 10, flexWrap: 'wrap',
    justifyContent: 'center', fontSize: '0.85rem',
    fontWeight: 600, color: '#888',
  },
  dot: { color: '#ccc' },
  offline: {
    background: '#fff3cd', border: '2px solid var(--accent)',
    borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: '0.88rem',
  },
};
