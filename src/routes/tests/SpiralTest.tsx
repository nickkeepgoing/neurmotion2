import { useEffect, useRef, useState } from 'react';
import Countdown from '../../components/Countdown';
import TestDone from '../../components/TestDone';
import TestIntro from '../../components/TestIntro';
import TestInvalid from '../../components/TestInvalid';
import TestShell from '../../components/TestShell';
import Button from '../../components/ui/Button';
import SpiralPractice from '../../components/practice/SpiralPractice';
import { useSettings } from '../../context/SettingsContext';
import { computeSpiralMetrics, spiralB, templatePoints, type Pt } from '../../lib/spiral';
import { computeSubScore } from '../../lib/scoring';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { MIN_VALID } from '../../lib/thresholds';

type Phase = 'intro' | 'countdown' | 'tracing' | 'done' | 'invalid';

const CANVAS = 310; // css px, square

export default function SpiralTest() {
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('intro');
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [subScore, setSubScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ptsRef = useRef<Pt[]>([]);
  const drawingRef = useRef(false);
  const startTimeRef = useRef(0);
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  const cx = CANVAS / 2;
  const cy = CANVAS / 2;
  const b = spiralB(CANVAS / 2 - 20);

  // render template + user trace
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS, CANVAS);

    /* Template drawn as a "road": a wide pale tolerance channel plus a dark
       centre line. The old single #DCE3E9 stroke was 1.30:1 on white — the
       core stimulus of the flagship test was near-invisible to a presbyopic
       eye — and it got LIGHTER once recording started. The guide is now
       #5A6B7A (5.50:1) and identical in every phase. */
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
    strokeTemplate('#E3EEF6', 20); // tolerance channel — "stay inside this"
    strokeTemplate('#5A6B7A', 4); // guide centre line

    // start dot at center
    ctx.beginPath();
    ctx.fillStyle = '#BC5411';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // user trace — white casing separates it from the dark guide line
    const pts = ptsRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = '#BC5411';
      ctx.lineWidth = 6.5;
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      // finger dot
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.fillStyle = '#BC5411';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.arc(last.x, last.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS * dpr;
    canvas.height = CANVAS * dpr;
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // elapsed timer while tracing
  useEffect(() => {
    if (phase !== 'tracing') return;
    const id = setInterval(() => setElapsed(Math.floor((performance.now() - startTimeRef.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [phase]);

  const getPos = (e: React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() };
  };

  const onDown = (e: React.PointerEvent) => {
    if (phaseRef.current !== 'tracing') return;
    drawingRef.current = true;
    try {
      canvasRef.current!.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers reject capture for synthetic/stylus pointers — tracing still works */
    }
    ptsRef.current.push(getPos(e));
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || phaseRef.current !== 'tracing') return;
    const p = getPos(e);
    ptsRef.current.push(p);
    redraw();

    // progress = how far around the spiral the finger has wound
    const m = computeSpiralMetrics(ptsRef.current, cx, cy, b);
    const pct = Math.round(m.coverage * 100);
    setProgress(pct);
    if (m.coverage >= 0.97) finish();
  };

  const onUp = () => {
    drawingRef.current = false;
  };

  const begin = () => {
    ptsRef.current = [];
    setProgress(0);
    setElapsed(0);
    startTimeRef.current = performance.now();
    setPhase('tracing');
    // restarting doesn't always change phase, so the redraw effect won't
    // fire — clear the canvas explicitly
    requestAnimationFrame(redraw);
  };

  // every start/restart goes through the 3-2-1 countdown first
  const start = () => setPhase('countdown');

  const finish = () => {
    if (phaseRef.current !== 'tracing') return;
    const m = computeSpiralMetrics(ptsRef.current, cx, cy, b);
    // A partial trace can't be scored fairly: spacing CV needs at least two
    // turn crossings, and a short trace was previously scored as if complete.
    if (m.coverage < MIN_VALID.spiralCoverage) {
      setPhase('invalid');
      return;
    }
    const metrics = {
      rmsErrorNorm: m.rmsErrorNorm,
      tremorBandPower: m.tremorBandPower,
      spacingCV: m.spacingCV,
      speedCV: m.speedCV,
      coverage: m.coverage,
    };
    const score = computeSubScore('spiral', metrics, settings.age);
    saveTestResult({ test: 'spiral', metrics, subScore: score, timestamp: new Date().toISOString() }, settings.userType);
    setSubScore(score);
    setPhase('done');
  };

  if (phase === 'done') {
    return (
      <TestShell stepLabel={S.stepLabel(1)} title={S.tests.spiral.title}>
        <TestDone subScore={subScore} />
      </TestShell>
    );
  }

  if (phase === 'invalid') {
    return (
      <TestShell stepLabel={S.stepLabel(1)} title={S.tests.spiral.title}>
        <TestInvalid test="spiral" onRetry={start} />
      </TestShell>
    );
  }

  if (phase === 'intro') {
    return (
      <TestShell stepLabel={S.stepLabel(1)} title={S.tests.spiral.title} instruction={S.tests.spiral.instruction}>
        <TestIntro testId="spiral" onStart={start} practice={<SpiralPractice />} />
      </TestShell>
    );
  }

  return (
    <TestShell
      stepLabel={phase === 'tracing' ? `⏱ 0:${String(elapsed).padStart(2, '0')}` : S.stepLabel(1)}
      title={phase === 'tracing' ? S.testing : S.tests.spiral.title}
      instruction={phase === 'tracing' ? S.keepGoing : S.tests.spiral.instruction}
    >
      <div className="flex-1 flex items-center justify-center my-3.5">
        <div className="relative bg-white rounded-[28px] shadow-[0_6px_22px_rgba(35,58,77,.08)] p-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            style={{ width: CANVAS, height: CANVAS }}
            className="touch-none-important rounded-[28px]"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>
      </div>

      {phase === 'tracing' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-lg font-bold text-muted-2">{S.progress}</span>
            <span className="text-xl font-extrabold text-primary">{progress}%</span>
          </div>
          <div className="h-3.5 bg-line-warm rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-3 mt-2.5">
            <Button variant="outline" size="md" onClick={start}>
              {S.restart}
            </Button>
            <Button size="md" onClick={finish} disabled={progress < MIN_VALID.spiralCoverage * 100}>
              เสร็จแล้ว
            </Button>
          </div>
        </div>
      )}

      {phase === 'countdown' && <Countdown hint={S.countdownHints.spiral} onDone={begin} />}
    </TestShell>
  );
}
