import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const TEAM_COLORS = ['var(--team0)', 'var(--team1)'];
const TEAM_BG = ['var(--team0-light)', 'var(--team1-light)'];

export default function Chat({ isArtist, myPlayerIndex }) {
  const { state, sendChat } = useGame();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const messages = state.chatMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    sendChat(text);
    setInput('');
    inputRef.current?.focus();
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>💬 Chat &amp; Guesses</div>

      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>Messages appear here.<br />Type your guesses below!</div>
        )}
        {messages.map((msg, i) => {
          if (msg.type === 'system') {
            return (
              <div key={i} style={styles.systemMsg}>
                ⚡ {msg.text}
              </div>
            );
          }
          const isMe = msg.playerId === myPlayerIndex;
          const tColor = TEAM_COLORS[msg.teamId] ?? '#888';
          const tBg = TEAM_BG[msg.teamId] ?? '#eee';
          return (
            <div
              key={i}
              className={msg.correct ? 'animate-bounce-in' : ''}
              style={{
                ...styles.chatMsg,
                ...(msg.correct ? styles.correctMsg : {}),
                ...(isMe ? styles.ownMsg : {}),
              }}
            >
              <span style={{ ...styles.badge, background: tBg, border: `1.5px solid ${tColor}`, color: tColor }}>
                {msg.playerName}
              </span>
              <span style={styles.msgText}>
                {msg.correct && '✅ '}{msg.text}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputRow}>
        {isArtist ? (
          <div style={styles.artistNote}>🎨 You're drawing — no guessing allowed!</div>
        ) : (
          <>
            <input
              ref={inputRef}
              style={styles.input}
              placeholder="Type your guess and press Enter..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={80}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              style={{ ...styles.sendBtn, opacity: input.trim() ? 1 : 0.4 }}
              onClick={handleSend}
            >↵</button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', flexDirection: 'column',
    background: 'white', border: '2.5px solid var(--ink)',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
    overflow: 'hidden', height: '100%', minHeight: 0,
  },
  header: {
    padding: '10px 14px',
    background: 'var(--ink)', color: 'white',
    fontWeight: 800, fontSize: '0.9rem', letterSpacing: 0.5, flexShrink: 0,
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '10px',
    display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0,
  },
  empty: {
    color: '#bbb', fontSize: '0.82rem', fontStyle: 'italic',
    textAlign: 'center', padding: '16px 0', lineHeight: 1.6,
  },
  systemMsg: {
    background: '#f0f4ff', border: '1.5px solid #d0d8ff',
    borderRadius: 8, padding: '5px 10px',
    fontSize: '0.8rem', color: '#557', fontStyle: 'italic',
  },
  chatMsg: {
    display: 'flex', flexDirection: 'column', gap: 2,
    padding: '6px 10px', borderRadius: 8,
    background: 'var(--cream)', border: '1.5px solid #eee',
  },
  correctMsg: {
    background: '#d4f7ea', border: '2px solid var(--green)',
    boxShadow: '0 0 0 3px rgba(42,157,143,0.15)',
  },
  ownMsg: { background: '#fff8e1', border: '1.5px solid var(--yellow)' },
  badge: {
    display: 'inline-block', padding: '1px 8px',
    borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, width: 'fit-content',
  },
  msgText: { fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-word' },
  inputRow: {
    padding: '8px', borderTop: '2px solid #eee',
    display: 'flex', gap: 6, flexShrink: 0,
  },
  input: {
    flex: 1, padding: '9px 12px',
    border: '2px solid var(--ink)', borderRadius: 10,
    fontSize: '0.9rem', fontFamily: 'var(--font-body)', fontWeight: 600,
    background: 'var(--cream)',
  },
  sendBtn: {
    padding: '9px 14px', background: 'var(--ink)', color: 'white',
    border: 'none', borderRadius: 10, fontWeight: 800,
    fontSize: '1rem', cursor: 'pointer', transition: 'opacity 0.1s', flexShrink: 0,
  },
  artistNote: {
    width: '100%', padding: '9px 12px',
    background: '#fff8e1', border: '2px dashed var(--accent)',
    borderRadius: 10, fontSize: '0.82rem', fontWeight: 700,
    textAlign: 'center', color: '#664',
  },
};
