import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';

const COLORS = [
  '#1a1a2e', '#e63946', '#457b9d', '#2a9d8f',
  '#f4a261', '#ffbe0b', '#6d6875', '#ffffff',
];
const SIZES = [3, 6, 12, 22];

export default function DrawingCanvas({ isArtist, disabled }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const { sendDraw } = useGame();
  const [color, setColor] = useState('#1a1a2e');
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState('pen');

  // Initialize white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Attach remote-draw handlers directly to DOM element for GameBoard to call
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.__drawRemote = ({ from, to, color: c, size: s, eraser }) => {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = eraser ? 'white' : c;
      ctx.lineWidth = eraser ? s * 2.5 : s;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    canvas.__clearCanvas = () => {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  }

  function drawLine(ctx, from, to, strokeColor, strokeSize, eraser) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = eraser ? 'white' : strokeColor;
    ctx.lineWidth = eraser ? strokeSize * 2.5 : strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function onPointerDown(e) {
    if (!isArtist || disabled) return;
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    sendDraw('draw:start', { x: pos.x, y: pos.y, color, size, tool });
  }

  function onPointerMove(e) {
    if (!isDrawing.current || !isArtist || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    const eraser = tool === 'eraser';
    drawLine(ctx, lastPos.current, pos, color, size, eraser);
    sendDraw('draw:move', { from: lastPos.current, to: pos, color, size, eraser });
    lastPos.current = pos;
  }

  function onPointerUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    sendDraw('draw:end', {});
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    sendDraw('draw:clear', {});
  }

  const cursorStyle = !isArtist || disabled ? 'default'
    : tool === 'eraser' ? 'cell' : 'crosshair';

  return (
    <div style={styles.wrapper}>
      <div style={styles.canvasWrap}>
        <canvas
          id="game-canvas"
          ref={canvasRef}
          width={900}
          height={540}
          style={{ ...styles.canvas, cursor: cursorStyle }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
        {!isArtist && (
          <div style={styles.badge}>👀 Watching</div>
        )}
      </div>

      {isArtist && (
        <div style={styles.toolbar}>
          {/* Color palette */}
          <div style={styles.toolGroup}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('pen'); }}
                title={c}
                style={{
                  ...styles.colorBtn,
                  background: c,
                  outline: color === c && tool === 'pen'
                    ? '3px solid var(--ink)' : '2px solid #ccc',
                  outlineOffset: 2,
                  transform: color === c && tool === 'pen' ? 'scale(1.25)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          <div style={styles.divider} />

          {/* Sizes */}
          <div style={styles.toolGroup}>
            {SIZES.map(s => (
              <button
                key={s}
                onClick={() => setSize(s)}
                style={{
                  ...styles.sizeBtn,
                  background: size === s ? 'var(--yellow)' : 'white',
                  border: `2px solid ${size === s ? 'var(--ink)' : '#ddd'}`,
                }}
              >
                <span style={{
                  display: 'block',
                  width: Math.min(s + 2, 20),
                  height: Math.min(s + 2, 20),
                  borderRadius: '50%',
                  background: 'var(--ink)',
                  flexShrink: 0,
                }} />
              </button>
            ))}
          </div>

          <div style={styles.divider} />

          {/* Tools */}
          <div style={styles.toolGroup}>
            <button
              onClick={() => setTool(t => t === 'eraser' ? 'pen' : 'eraser')}
              style={{
                ...styles.toolBtn,
                background: tool === 'eraser' ? 'var(--yellow)' : 'white',
                border: `2px solid ${tool === 'eraser' ? 'var(--ink)' : '#ddd'}`,
              }}
              title="Eraser (E)"
            >🧹</button>
            <button
              onClick={clearCanvas}
              style={{ ...styles.toolBtn, background: '#ffe0e0', border: '2px solid var(--team0)' }}
              title="Clear all"
            >🗑️</button>
          </div>

          <div style={styles.divider} />
          <span style={styles.hint}>
            {tool === 'eraser' ? '🧹 Eraser' : `🖊️ ${size}px`}
          </span>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 },
  canvasWrap: {
    position: 'relative',
    flex: 1,
    background: 'white',
    border: '3px solid var(--ink)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    minHeight: 0,
  },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },
  badge: {
    position: 'absolute', top: 10, right: 14,
    background: 'rgba(0,0,0,0.55)', color: 'white',
    padding: '3px 10px', borderRadius: 20,
    fontSize: '0.78rem', fontWeight: 700, pointerEvents: 'none',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    background: 'white', border: '2.5px solid var(--ink)',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
    padding: '8px 14px', flexShrink: 0,
  },
  toolGroup: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  colorBtn: {
    width: 26, height: 26, borderRadius: '50%', border: 'none',
    cursor: 'pointer', transition: 'transform 0.1s, outline 0.1s', flexShrink: 0,
  },
  sizeBtn: {
    width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.1s', flexShrink: 0,
  },
  toolBtn: {
    width: 38, height: 38, borderRadius: 8, cursor: 'pointer',
    fontSize: '1rem', transition: 'all 0.1s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  divider: { width: 2, height: 28, background: '#e8e8e8', borderRadius: 2, margin: '0 2px' },
  hint: { fontSize: '0.8rem', fontWeight: 700, color: '#888', marginLeft: 4 },
};
