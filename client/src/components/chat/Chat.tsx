import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useGame } from '../../context/GameContext';
import { getTeamColor, getTeamLight } from '../ui/TeamBadge';
import type { ChatMessage, PlayerIndex } from '../../types';
import '../../styles/Chat.css';

interface ChatProps {
  isArtist: boolean;
  myPlayerIndex: PlayerIndex | null;
}

export function Chat({ isArtist, myPlayerIndex }: ChatProps) {
  const { state, sendChat } = useGame();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages.length]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    sendChat(text);
    setInput('');
    inputRef.current?.focus();
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">💬 Chat &amp; Guesses</div>

      <div className="chat-messages">
        {state.chatMessages.length === 0 && (
          <p className="chat-empty">
            Messages appear here.<br />Type your guesses below!
          </p>
        )}

        {state.chatMessages.map((msg, i) => (
          <ChatMessageRow
            key={`${msg.timestamp}-${i}`}
            message={msg}
            isOwn={msg.playerId === myPlayerIndex}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row">
        {isArtist ? (
          <div className="chat-artist-note">🎨 You're drawing — no guessing allowed!</div>
        ) : (
          <>
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Type your guess…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={80}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              ↵
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function ChatMessageRow({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  if (message.type === 'system') {
    return <div className="chat-system-msg">⚡ {message.text}</div>;
  }

  const teamId = message.teamId ?? 0;
  const color = getTeamColor(teamId);
  const light = getTeamLight(teamId);

  const classes = [
    'chat-msg',
    message.correct ? 'correct' : '',
    isOwn ? 'own' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <span
        className="chat-player-badge"
        style={{ color, background: light, borderColor: color }}
      >
        {message.playerName}
      </span>
      <span className="chat-msg-text">
        {message.correct && '✅ '}{message.text}
      </span>
    </div>
  );
}
