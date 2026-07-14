import { useEffect, useRef, useState } from 'react';
import Countdown from '../../components/Countdown';
import TestDemo from '../../components/TestDemo';
import TestDone from '../../components/TestDone';
import TestShell from '../../components/TestShell';
import Button from '../../components/ui/Button';
import { useSettings } from '../../context/SettingsContext';
import { computeSubScore } from '../../lib/scoring';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { computeTappingMetrics } from '../../lib/tapping';
import { TAPPING } from '../../lib/thresholds';

type Phase = 'ready' | 'countdown' | 'running' | 'done';

export default function TappingTest() {
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TAPPING.durationS);
  const [beat, setBeat] = useState(0);
  const [subScore, setSubScore] = useState(0);

  const tapsRef = useRef<number[]>([]);
  const audioRef = useRef<AudioContext | null>(null);

  // metronome beep
  const click = (accent: boolean) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 880 : 660;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const beatId = setInterval(() => {
      setBeat((b) => {
        click(b % 4 === 3);
        return b + 1;
      });
    }, TAPPING.beatMs);
    const tickId = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      clearInterval(beatId);
      clearInterval(tickId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const begin = () => {
    tapsRef.current = [];
    setCount(0);
    setBeat(0);
    setSecondsLeft(TAPPING.durationS);
    audioRef.current = audioRef.current ?? new AudioContext();
    void audioRef.current.resume();
    setPhase('running');
  };

  const finish = () => {
    const m = computeTappingMetrics(tapsRef.current);
    const metrics = { rate: m.rate, itiSD: m.itiSD, decrementSlope: m.decrementSlope, timingError: m.timingError, count: m.count };
    const score = computeSubScore('tapping', metrics);
    saveTestResult({ test: 'tapping', metrics, subScore: score, timestamp: new Date().toISOString() }, settings.userType);
    setSubScore(score);
    setPhase('done');
  };

  const tap = () => {
    if (phase !== 'running') return;
    tapsRef.current.push(performance.now());
    setCount(tapsRef.current.length);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  if (phase === 'done') {
    return (
      <TestShell stepLabel={S.stepLabel(2)} title={S.tests.tapping.title}>
        <TestDone subScore={subScore} />
      </TestShell>
    );
  }

  return (
    <TestShell
      stepLabel={S.stepLabel(2)}
      title={S.tests.tapping.title}
      instruction={S.tests.tapping.instruction}
      demo={phase !== 'running' ? <TestDemo test="tapping" /> : undefined}
    >
      {phase === 'running' && (
        <>
          {/* Rhythm dots */}
          <div className="flex items-center justify-center gap-3.5 mt-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-colors ${beat % 4 === i ? 'bg-primary' : 'bg-[#F0C39E]'}`} />
            ))}
            <span className="text-[15px] font-semibold text-muted ml-1.5">{S.rhythm}</span>
          </div>

          {/* Tap target */}
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="relative w-[230px] h-[230px] flex items-center justify-center">
              {/* key={beat} remounts the ring so it flashes exactly on each metronome tick */}
              <div key={beat} className="absolute inset-0 rounded-full bg-primary nm-beat-ping" />
              <button
                onPointerDown={tap}
                aria-label="แตะ"
                className="relative w-[190px] h-[190px] rounded-full border-0 cursor-pointer flex flex-col items-center justify-center gap-1 select-none active:scale-95 transition-transform touch-none-important
                  bg-[radial-gradient(circle_at_38%_32%,#F2924E,#E8762C_60%,#D9681F)] shadow-[0_12px_30px_rgba(232,118,44,.4),inset_0_-6px_12px_rgba(0,0,0,.12)]"
              >
                <span className="text-3xl font-extrabold text-white">แตะ</span>
                <span className="font-num text-[15px] font-bold text-white/85 tracking-widest">TAP</span>
              </button>
            </div>
          </div>

          {/* Live counters */}
          <div className="flex gap-3 mb-2">
            <div className="flex-1 bg-white rounded-[18px] px-4 py-3.5 shadow-[0_3px_12px_rgba(35,58,77,.06)] flex flex-col items-center gap-0.5">
              <span className="font-num text-[32px] font-black text-primary leading-none">{count}</span>
              <span className="text-[15px] font-bold text-muted">{S.taps}</span>
            </div>
            <div className="flex-1 bg-white rounded-[18px] px-4 py-3.5 shadow-[0_3px_12px_rgba(35,58,77,.06)] flex flex-col items-center gap-0.5">
              <span className="font-num text-[32px] font-black text-secondary leading-none">{secondsLeft}</span>
              <span className="text-[15px] font-bold text-muted">{S.secondsLeft}</span>
            </div>
          </div>
        </>
      )}

      {phase !== 'running' && (
        <>
          {/* compact ready view: the start button stays above the fold */}
          <div className="flex-1" />
          <Button className="nm-blink" onClick={() => setPhase('countdown')}>
            {S.ready}
          </Button>
        </>
      )}

      {phase === 'countdown' && <Countdown hint={S.countdownHints.tapping} onDone={begin} />}
    </TestShell>
  );
}
