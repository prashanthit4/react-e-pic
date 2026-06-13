import { useRef, useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { DrawPoint } from '../../types';
import '../../styles/DrawingCanvas.css';

const COLORS = [
  '#1a1a2e', '#e63946', '#457b9d', '#2a9d8f',
  '#f4a261', '#ffbe0b', '#6d6875', '#ffffff',
] as const;

const SIZES = [3, 6, 12, 22] as const;

// Augment HTMLCanvasElement to carry remote-draw handlers
declare global {
  interface HTMLCanvasElement {
    __drawRemote?: (payload: { from: DrawPoint; to: DrawPoint; color: string; size: number; eraser: boolean }) => void;
    __clearCanvas?: () => void;
  }
}

interface DrawingCanvasProps {
  isArtist: boolean;
  disabled?: boolean;
}

export function DrawingCanvas({ isArtist, disabled = false }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<DrawPoint | null>(null);
  const { sendDraw } = useGame();

  const [color, setColor] = useState<string>('#1a1a2e');
  const [size, setSize] = useState<number>(6);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  // White background on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Attach remote-draw handlers to DOM node so GameBoard can call them
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.__drawRemote = ({ from, to, color: c, size: s, eraser }) => {
      const ctx = canvas.getContext('2d')!;
      drawLine(ctx, from, to, c, s, eraser);
    };

    canvas.__clearCanvas = () => {
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent): DrawPoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = 'touches' in e ? e.touches[0]! : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  }

  function drawLine(
    ctx: CanvasRenderingContext2D,
    from: DrawPoint,
    to: DrawPoint,
    strokeColor: string,
    strokeSize: number,
    eraser: boolean,
  ) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = eraser ? 'white' : strokeColor;
    ctx.lineWidth = eraser ? strokeSize * 2.5 : strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function onPointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (!isArtist || disabled) return;
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    sendDraw('draw:start', { x: pos.x, y: pos.y, color, size, tool });
  }

  function onPointerMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current || !isArtist || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    const eraser = tool === 'eraser';
    drawLine(ctx, lastPos.current!, pos, color, size, eraser);
    sendDraw('draw:move', { from: lastPos.current!, to: pos, color, size, eraser });
    lastPos.current = pos;
  }

  function onPointerUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    sendDraw('draw:end');
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    sendDraw('draw:clear');
  }

  const cursorStyle = !isArtist || disabled ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair';

  return (
    <div className="canvas-wrapper">
      {/* Canvas frame */}
      <div className="canvas-frame">
        <canvas
          id="game-canvas"
          ref={canvasRef}
          width={900}
          height={540}
          className="canvas-el"
          style={{ cursor: cursorStyle }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
        {!isArtist && <div className="canvas-watch-badge">👀 Watching</div>}
      </div>

      {/* Toolbar — artist only */}
      {isArtist && (
        <div className="canvas-toolbar">
          {/* Colour palette */}
          <div className="canvas-tool-group">
            {COLORS.map(c => (
              <button
                key={c}
                title={c}
                className={`canvas-color-btn ${color === c && tool === 'pen' ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => { setColor(c); setTool('pen'); }}
              />
            ))}
          </div>

          <div className="divider" />

          {/* Brush sizes */}
          <div className="canvas-tool-group">
            {SIZES.map(s => (
              <button
                key={s}
                className={`canvas-size-btn ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
                title={`${s}px`}
              >
                <span
                  className="canvas-size-dot"
                  style={{ width: Math.min(s + 2, 20), height: Math.min(s + 2, 20) }}
                />
              </button>
            ))}
          </div>

          <div className="divider" />

          {/* Eraser + clear */}
          <div className="canvas-tool-group">
            <button
              className={`canvas-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool(t => (t === 'eraser' ? 'pen' : 'eraser'))}
              title="Eraser"
            >
              🧹
            </button>
            <button
              className="canvas-tool-btn danger"
              onClick={clearCanvas}
              title="Clear all"
            >
              🗑️
            </button>
          </div>

          <div className="divider" />
          <span className="canvas-hint">
            {tool === 'eraser' ? '🧹 Eraser' : `🖊️ ${size}px`}
          </span>
        </div>
      )}
    </div>
  );
}
