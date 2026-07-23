import { useEffect, useRef } from 'react';
import { spiralB, templatePoints, type Pt } from '../../lib/spiral';
import { S } from '../../lib/strings';

const SIZE = 250;

/** Practice spiral: free-draw over the template, no scoring, clear button. */
export default function SpiralPractice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ptsRef = useRef<Pt[]>([]);
  const drawingRef = useRef(false);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const b = spiralB(SIZE / 2 - 16);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    // template — same high-contrast "road" as the real test
    const tpl = templatePoints(cx, cy, b);
    const strokeTemplate = (color: string, width: number) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      tpl.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    };
    strokeTemplate('#E3EEF6', 17);
    strokeTemplate('#5A6B7A', 3.5);
    ctx.beginPath();
    ctx.fillStyle = '#BC5411';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // user
    const pts = ptsRef.current;
    if (pts.length > 1) {
      const strokeUser = (color: string, width: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      };
      strokeUser('#FFFFFF', 9);
      strokeUser('#BC5411', 5);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        style={{ width: SIZE, height: SIZE }}
        className="touch-none-important rounded-[24px] bg-white shadow-[0_6px_22px_rgba(35,58,77,.08)]"
        onPointerDown={(e) => {
          drawingRef.current = true;
          ptsRef.current = [pos(e)];
          redraw();
        }}
        onPointerMove={(e) => {
          if (!drawingRef.current) return;
          ptsRef.current.push(pos(e));
          redraw();
        }}
        onPointerUp={() => (drawingRef.current = false)}
        onPointerCancel={() => (drawingRef.current = false)}
      />
      <div className="flex items-center gap-4">
        <p className="text-base font-semibold text-muted-2 m-0">{S.flow.practiceSpiral}</p>
        <button
          onClick={() => {
            ptsRef.current = [];
            redraw();
          }}
          className="min-h-14 px-2 text-base font-bold text-secondary bg-transparent border-0 underline cursor-pointer"
        >
          {S.restart}
        </button>
      </div>
    </div>
  );
}
