import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Countdown from '../../components/Countdown';
import TestDone from '../../components/TestDone';
import TestIntro from '../../components/TestIntro';
import TestShell from '../../components/TestShell';
import Button from '../../components/ui/Button';
import { useSettings } from '../../context/SettingsContext';
import { speak } from '../../lib/speech';
import { computeSubScore } from '../../lib/scoring';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { TREMOR } from '../../lib/thresholds';
import { combineTremor, computePhaseMetrics, requestMotionPermission, type MotionSample } from '../../lib/tremor';

type Phase =
  | 'intro'
  | 'countdown' // 3-2-1 before phase 1 (postural)
  | 'postural' // hold in the air
  | 'switch' // rest your arm on a table/lap
  | 'countdown2' // 3-2-1 before phase 2 (rest)
  | 'rest' // arm supported
  | 'done'
  | 'unsupported'
  | 'denied';

export default function TremorTest() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [secondsLeft, setSecondsLeft] = useState(TREMOR.phaseS);
  const [subScore, setSubScore] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const posturalRef = useRef<MotionSample[]>([]);
  const restRef = useRef<MotionSample[]>([]);
  const tiltRef = useRef({ x: 0, y: 0 });
  const baseRef = useRef<{ x: number; y: number; n: number } | null>(null);
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  const isCapturing = phase === 'postural' || phase === 'rest';

  useEffect(() => {
    if (!isCapturing) return;
    const target = phase === 'postural' ? posturalRef : restRef;
    baseRef.current = null; // recalibrate the bubble for the new pose

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      const gx = a.x ?? 0;
      const gy = a.y ?? 0;
      target.current.push({ t: performance.now(), mag: Math.hypot(gx, gy, a.z ?? 0) });

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
    const bubbleId = setInterval(() => setTilt({ ...tiltRef.current }), 100);

    // pure countdown display
    setSecondsLeft(TREMOR.phaseS);
    const tickId = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);

    // end the phase after its full duration (kept out of the setState updater)
    const endId = setTimeout(() => (phase === 'postural' ? endPostural() : endRest()), TREMOR.phaseS * 1000);

    // no data after 2 s → sensor missing (common on desktop)
    const checkId = setTimeout(() => {
      if (target.current.length < 5 && (phaseRef.current === 'postural' || phaseRef.current === 'rest')) {
        setPhase('unsupported');
      }
    }, 2000);

    return () => {
      window.removeEventListener('devicemotion', onMotion);
      clearInterval(bubbleId);
      clearInterval(tickId);
      clearTimeout(endId);
      clearTimeout(checkId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async () => {
    const perm = await requestMotionPermission();
    if (perm === 'unsupported') return setPhase('unsupported');
    if (perm === 'denied') return setPhase('denied');
    posturalRef.current = [];
    restRef.current = [];
    setPhase('countdown');
  };

  const endPostural = () => {
    if (phaseRef.current !== 'postural') return;
    if (computePhaseMetrics(posturalRef.current).samples < 20) return setPhase('unsupported');
    if (settings.voiceOn) speak(S.tremorPhase.switchNow);
    setPhase('switch');
  };

  const endRest = () => {
    if (phaseRef.current !== 'rest') return;
    const m = combineTremor(posturalRef.current, restRef.current);
    const metrics = {
      restBandPower: m.restBandPower,
      restRms: m.restRms,
      posturalBandPower: m.posturalBandPower,
      posturalRms: m.posturalRms,
      samples: m.samples,
    };
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

  if (phase === 'intro') {
    return (
      <TestShell stepLabel={S.stepLabel(3)} title={S.tests.tremor.title} instruction={S.tests.tremor.instruction}>
        <TestIntro testId="tremor" onStart={start} />
      </TestShell>
    );
  }

  const phaseLabel = phase === 'rest' || phase === 'countdown2' || phase === 'switch' ? S.tremorPhase.rest : S.tremorPhase.postural;
  const phaseInstr = phase === 'rest' || phase === 'countdown2' || phase === 'switch' ? S.tremorPhase.restInstr : S.tremorPhase.posturalInstr;

  return (
    <TestShell stepLabel={S.stepLabel(3)} title={S.tests.tremor.title} instruction={phaseInstr}>
      {/* phase chips */}
      {phase !== 'unsupported' && phase !== 'denied' && (
        <div className="flex items-center gap-2 mt-3">
          <span className={`flex-1 text-center text-[15px] font-bold rounded-full py-2 ${phase === 'postural' || phase === 'countdown' ? 'bg-secondary text-white' : 'bg-secondary-soft text-secondary'}`}>
            1 · {S.tremorPhase.posturalShort}
          </span>
          <span className={`flex-1 text-center text-[15px] font-bold rounded-full py-2 ${phase === 'rest' || phase === 'countdown2' || phase === 'switch' ? 'bg-secondary text-white' : 'bg-line-warm text-muted'}`}>
            2 · {S.tremorPhase.restShort}
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-6">
        {(phase === 'countdown' || phase === 'countdown2') && (
          <div className="relative w-[200px] h-[200px] flex items-center justify-center">
            <div className="absolute inset-4 rounded-full bg-secondary-soft" />
            <svg width="84" height="84" viewBox="0 0 24 24" fill="none" className="relative">
              <rect x="8" y="3" width="8" height="14" rx="2.5" stroke="#1B6CA8" strokeWidth="1.6" />
              <path d="M9 17 v1.5 c0 1.8 1.2 2.8 3 2.8 s3-1 3-2.8" stroke="#1B6CA8" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {phase === 'switch' && (
          <div className="flex flex-col items-center gap-5 px-2">
            <div className="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center text-4xl">🪑</div>
            <p className="text-xl font-extrabold text-ink text-center leading-relaxed">{S.tremorPhase.switchNow}</p>
            <p className="text-base font-semibold text-muted-2 text-center leading-relaxed">{S.tremorPhase.restInstr}</p>
          </div>
        )}

        {isCapturing &&
          (() => {
            const clamp = (v: number) => Math.max(-1, Math.min(1, v));
            const dx = clamp(-tilt.x / 2.5) * 78;
            const dy = clamp(tilt.y / 2.5) * 78;
            const dist = Math.hypot(dx, dy) / 78;
            const bubbleColor = dist < 0.25 ? '#2E9E5B' : dist < 0.6 ? '#F1C232' : '#D64545';
            const label = dist < 0.25 ? S.levelSteady : S.levelAdjust;
            const labelCls = dist < 0.25 ? 'text-risk-low-text' : 'text-risk-med-text';
            return (
              <>
                <div className="relative w-[220px] h-[220px]" aria-label={label}>
                  <div className="absolute inset-0 rounded-full border-[3px] border-line bg-white shadow-[0_6px_22px_rgba(35,58,77,.08)]" />
                  <div className="absolute inset-[40px] rounded-full border-2 border-dashed border-line" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[62px] h-[62px] rounded-full border-[3px] border-risk-low bg-risk-low-bg/60" />
                  <div className="absolute left-1/2 top-3 bottom-3 w-px bg-line -translate-x-1/2" />
                  <div className="absolute top-1/2 left-3 right-3 h-px bg-line -translate-y-1/2" />
                  <div
                    className="absolute left-1/2 top-1/2 w-11 h-11 rounded-full transition-transform duration-100 ease-out shadow-[0_4px_12px_rgba(35,58,77,.25)]"
                    style={{ transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`, background: bubbleColor }}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-num text-5xl font-black text-secondary leading-none">{secondsLeft}</span>
                  <span className={`text-xl font-bold ${labelCls}`}>{label}</span>
                </div>
                <p className="text-lg font-semibold text-muted-2 -mt-2">{phaseLabel}</p>
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

      {phase === 'switch' && (
        <Button className="nm-blink" onClick={() => setPhase('countdown2')}>
          {S.ready}
        </Button>
      )}
      {(phase === 'unsupported' || phase === 'denied') && (
        <Button variant="outline" onClick={() => navigate('/home')}>
          {S.skip}
        </Button>
      )}

      {phase === 'countdown' && <Countdown hint={S.tremorPhase.posturalInstr} onDone={() => setPhase('postural')} />}
      {phase === 'countdown2' && <Countdown hint={S.tremorPhase.restInstr} onDone={() => setPhase('rest')} />}
    </TestShell>
  );
}
