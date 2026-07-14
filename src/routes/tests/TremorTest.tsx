import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Countdown from '../../components/Countdown';
import TestDemo from '../../components/TestDemo';
import TestDone from '../../components/TestDone';
import TestShell from '../../components/TestShell';
import Button from '../../components/ui/Button';
import { useSettings } from '../../context/SettingsContext';
import { computeSubScore } from '../../lib/scoring';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { TREMOR } from '../../lib/thresholds';
import { computeTremorMetrics, requestMotionPermission, type MotionSample } from '../../lib/tremor';

type Phase = 'ready' | 'countdown' | 'running' | 'done' | 'unsupported' | 'denied';

export default function TremorTest() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState(TREMOR.durationS);
  const [subScore, setSubScore] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 }); // deviation from starting pose (m/s²)
  const samplesRef = useRef<MotionSample[]>([]);
  const tiltRef = useRef({ x: 0, y: 0 });
  const baseRef = useRef<{ x: number; y: number; n: number } | null>(null);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;

  useEffect(() => {
    if (phase !== 'running') return;

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      const gx = a.x ?? 0;
      const gy = a.y ?? 0;
      samplesRef.current.push({ t: performance.now(), mag: Math.hypot(gx, gy, a.z ?? 0) });

      // bubble level: average the first ~15 samples as the "start pose" baseline,
      // then show deviation from it so the user can steer back to level
      const base = baseRef.current;
      if (!base || base.n < 15) {
        baseRef.current = base
          ? { x: (base.x * base.n + gx) / (base.n + 1), y: (base.y * base.n + gy) / (base.n + 1), n: base.n + 1 }
          : { x: gx, y: gy, n: 1 };
      } else {
        tiltRef.current = { x: gx - base.x, y: gy - base.y };
      }
    };
    window.addEventListener('devicemotion', onMotion);

    // throttle bubble UI updates to ~10 fps so re-renders stay cheap
    const bubbleId = setInterval(() => setTilt({ ...tiltRef.current }), 100);

    const tickId = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // no data after 2s → sensor missing (common on desktop)
    const checkId = setTimeout(() => {
      if (samplesRef.current.length < 5 && phaseRef.current === 'running') setPhase('unsupported');
    }, 2000);

    return () => {
      window.removeEventListener('devicemotion', onMotion);
      clearInterval(tickId);
      clearInterval(bubbleId);
      clearTimeout(checkId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async () => {
    const perm = await requestMotionPermission();
    if (perm === 'unsupported') {
      setPhase('unsupported');
      return;
    }
    if (perm === 'denied') {
      setPhase('denied');
      return;
    }
    setPhase('countdown'); // permission granted → 3-2-1 → capture
  };

  const begin = () => {
    samplesRef.current = [];
    baseRef.current = null;
    tiltRef.current = { x: 0, y: 0 };
    setTilt({ x: 0, y: 0 });
    setSecondsLeft(TREMOR.durationS);
    setPhase('running');
  };

  const finish = () => {
    if (phaseRef.current !== 'running') return;
    const m = computeTremorMetrics(samplesRef.current);
    if (m.samples < 20) {
      setPhase('unsupported');
      return;
    }
    const metrics = { tremorBandPower: m.tremorBandPower, rmsAccel: m.rmsAccel, samples: m.samples };
    const score = computeSubScore('tremor', metrics);
    saveTestResult({ test: 'tremor', metrics, subScore: score, timestamp: new Date().toISOString() }, settings.userType);
    setSubScore(score);
    setPhase('done');
  };

  if (phase === 'done') {
    return (
      <TestShell stepLabel={S.stepLabel(3)} title={S.tests.tremor.title}>
        <TestDone subScore={subScore} />
      </TestShell>
    );
  }

  return (
    <TestShell
      stepLabel={S.stepLabel(3)}
      title={S.tests.tremor.title}
      instruction={S.tests.tremor.instruction}
      demo={phase === 'ready' ? <TestDemo test="tremor" /> : undefined}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
        {(phase === 'ready' || phase === 'countdown') && (
          <div className="relative w-[210px] h-[210px] flex items-center justify-center">
            <div className="absolute inset-4 rounded-full bg-secondary-soft" />
            <svg width="90" height="90" viewBox="0 0 24 24" fill="none" className="relative">
              <rect x="8" y="3" width="8" height="14" rx="2.5" stroke="#1B6CA8" strokeWidth="1.6" />
              <path d="M4 8 q1.5 -2 0 -4 M20 8 q-1.5 -2 0 -4" stroke="#1B6CA8" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M9 17 v1.5 c0 1.8 1.2 2.8 3 2.8 s3-1 3-2.8" stroke="#1B6CA8" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {phase === 'running' &&
          (() => {
            // bubble level: deviation from the starting pose → bubble offset
            const clamp = (v: number) => Math.max(-1, Math.min(1, v));
            const dx = clamp(-tilt.x / 2.5) * 78;
            const dy = clamp(tilt.y / 2.5) * 78;
            const dist = Math.hypot(dx, dy) / 78;
            const bubbleColor = dist < 0.25 ? '#2E9E5B' : dist < 0.6 ? '#F1C232' : '#D64545';
            const label = dist < 0.25 ? S.levelSteady : S.levelAdjust;
            const labelCls = dist < 0.25 ? 'text-risk-low-text' : 'text-risk-med-text';
            return (
              <>
                <div className="relative w-[230px] h-[230px]" aria-label={label}>
                  {/* rings */}
                  <div className="absolute inset-0 rounded-full border-[3px] border-line bg-white shadow-[0_6px_22px_rgba(35,58,77,.08)]" />
                  <div className="absolute inset-[42px] rounded-full border-2 border-dashed border-line" />
                  {/* center target */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[64px] h-[64px] rounded-full border-[3px] border-risk-low bg-risk-low-bg/60" />
                  {/* crosshair */}
                  <div className="absolute left-1/2 top-3 bottom-3 w-px bg-line -translate-x-1/2" />
                  <div className="absolute top-1/2 left-3 right-3 h-px bg-line -translate-y-1/2" />
                  {/* bubble */}
                  <div
                    className="absolute left-1/2 top-1/2 w-11 h-11 rounded-full transition-transform duration-100 ease-out shadow-[0_4px_12px_rgba(35,58,77,.25)]"
                    style={{ transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`, background: bubbleColor }}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-num text-5xl font-black text-secondary leading-none">{secondsLeft}</span>
                  <span className={`text-xl font-bold ${labelCls}`}>{label}</span>
                </div>
                <p className="text-lg font-semibold text-muted-2 -mt-2">{S.holdStill}</p>
              </>
            );
          })()}

        {(phase === 'unsupported' || phase === 'denied') && (
          <div className="flex flex-col items-center gap-5 px-2">
            <div className="w-16 h-16 rounded-full bg-risk-med-bg flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l9 16H3l9-16z" stroke="#9C7A10" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 10v4M12 17v.1" stroke="#9C7A10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed">
              {phase === 'unsupported' ? S.motionUnsupported : S.permissionDenied}
            </p>
          </div>
        )}
      </div>

      {phase === 'ready' && (
        <Button className="nm-blink" onClick={start}>
          {S.ready}
        </Button>
      )}
      {(phase === 'unsupported' || phase === 'denied') && (
        <Button variant="outline" onClick={() => navigate('/home')}>
          {S.skip}
        </Button>
      )}

      {phase === 'countdown' && <Countdown hint={S.countdownHints.tremor} onDone={begin} />}
    </TestShell>
  );
}
