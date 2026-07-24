import { useEffect, useRef, useState } from 'react';
import Countdown from '../../components/Countdown';
import TestDone from '../../components/TestDone';
import TestIntro from '../../components/TestIntro';
import TestInvalid from '../../components/TestInvalid';
import TestShell from '../../components/TestShell';
import Button from '../../components/ui/Button';
import TapPractice from '../../components/practice/TapPractice';
import { useSettings } from '../../context/SettingsContext';
import { computeSubScore } from '../../lib/scoring';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { combineTapping } from '../../lib/tapping';
import { MIN_VALID, TAPPING } from '../../lib/thresholds';

/** The three blocks, in order. See lib/tapping.ts for why each exists. */
type Block = 'paced' | 'maxDominant' | 'maxOther';
const BLOCK_ORDER: Block[] = ['paced', 'maxDominant', 'maxOther'];

type Phase = 'intro' | 'countdown' | 'running' | 'switch' | 'done' | 'invalid';

/**
 * Progress across the three blocks — number circles + connectors with the
 * current block's name on one caption line. The previous three text pills
 * crammed "2 · เร็วสุด · มือถนัด" into a small box and wrapped to two lines.
 */
function BlockChips({ block }: { block: Block }) {
  const labels: Record<Block, string> = {
    paced: S.tapBlock.pacedShort,
    maxDominant: S.tapBlock.maxDominantShort,
    maxOther: S.tapBlock.maxOtherShort,
  };
  const idx = BLOCK_ORDER.indexOf(block);
  return (
    <div className="mt-3 flex flex-col gap-2" aria-label={`ช่วงที่ ${idx + 1} จาก 3: ${labels[block]}`}>
      <div className="flex items-center gap-2" aria-hidden="true">
        {BLOCK_ORDER.map((b, i) => (
          <div key={b} className={`flex items-center gap-2 ${i < 2 ? 'flex-1' : ''}`}>
            <span
              className={`flex-none w-10 h-10 rounded-full flex items-center justify-center text-lg font-num font-extrabold ${
                i === idx ? 'bg-secondary text-white ring-4 ring-secondary-soft' : i < idx ? 'bg-risk-low text-white' : 'bg-white text-muted border-2 border-field'
              }`}
            >
              {i < idx ? '✓' : i + 1}
            </span>
            {i < 2 && <div className={`flex-1 h-1 rounded-full ${i < idx ? 'bg-risk-low' : 'bg-line'}`} />}
          </div>
        ))}
      </div>
      <span className="text-base font-bold text-ink">
        ช่วงที่ {idx + 1} จาก 3 · {labels[block]}
      </span>
    </div>
  );
}

export default function TappingTest() {
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('intro');
  const [block, setBlock] = useState<Block>('paced');
  const [count, setCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TAPPING.durationS);
  const [beat, setBeat] = useState(0);
  const [subScore, setSubScore] = useState(0);

  const tapsRef = useRef<number[]>([]);
  const blocksRef = useRef<Record<Block, number[]>>({ paced: [], maxDominant: [], maxOther: [] });
  const blockRef = useRef<Block>('paced');
  blockRef.current = block;
  const audioRef = useRef<AudioContext | null>(null);

  const isPaced = block === 'paced';

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
    // the metronome runs in the paced block only — the maximal blocks are
    // deliberately unpaced, since a beat would cap the rate being measured
    const beatId = isPaced
      ? setInterval(() => {
          setBeat((b) => {
            click(b % 4 === 3);
            return b + 1;
          });
        }, TAPPING.beatMs)
      : undefined;
    const tickId = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const endId = setTimeout(endBlock, TAPPING.durationS * 1000);
    return () => {
      if (beatId) clearInterval(beatId);
      clearInterval(tickId);
      clearTimeout(endId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, block]);

  const begin = () => {
    tapsRef.current = [];
    setCount(0);
    setBeat(0);
    setSecondsLeft(TAPPING.durationS);
    audioRef.current = audioRef.current ?? new AudioContext();
    void audioRef.current.resume();
    setPhase('running');
  };

  /** Store this block's taps, then move to the next block or score. */
  const endBlock = () => {
    const current = blockRef.current;
    blocksRef.current[current] = tapsRef.current.slice();
    const next = BLOCK_ORDER[BLOCK_ORDER.indexOf(current) + 1];
    if (next) {
      setBlock(next);
      setPhase('switch');
      return;
    }
    finish();
  };

  const finish = () => {
    const b = blocksRef.current;
    // Too few taps → the interval statistics are meaningless and every one of
    // them would clamp to "perfect". Refuse to score rather than report a
    // reassuring number for someone who could not do the test.
    if (BLOCK_ORDER.some((k) => b[k].length < MIN_VALID.tappingCount)) {
      setPhase('invalid');
      return;
    }
    const m = combineTapping(b.paced, b.maxDominant, b.maxOther);
    const metrics = {
      rate: m.rate,
      itiSD: m.itiSD,
      decrementSlope: m.decrementSlope,
      timingError: m.timingError,
      asymmetry: m.asymmetry,
      count: m.count,
    };
    const score = computeSubScore('tapping', metrics, settings.age);
    saveTestResult({ test: 'tapping', metrics, subScore: score, timestamp: new Date().toISOString() }, settings.userType);
    setSubScore(score);
    setPhase('done');
  };

  /** Restart the whole test from the first block. */
  const restart = () => {
    blocksRef.current = { paced: [], maxDominant: [], maxOther: [] };
    setBlock('paced');
    setPhase('countdown');
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

  if (phase === 'invalid') {
    return (
      <TestShell stepLabel={S.stepLabel(2)} title={S.tests.tapping.title}>
        <TestInvalid test="tapping" onRetry={restart} />
      </TestShell>
    );
  }

  if (phase === 'intro') {
    return (
      <TestShell stepLabel={S.stepLabel(2)} title={S.tests.tapping.title} instruction={S.tests.tapping.instruction}>
        <TestIntro testId="tapping" onStart={restart} practice={<TapPractice />} />
      </TestShell>
    );
  }

  const blockInstr = isPaced ? S.tapBlock.pacedInstr : S.tapBlock.maxInstr;

  if (phase === 'switch') {
    return (
      <TestShell stepLabel={S.stepLabel(2)} title={S.tests.tapping.title} instruction={blockInstr}>
        <BlockChips block={block} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-2">
          <div className="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center text-4xl">
            {block === 'maxOther' ? '🔄' : '⚡'}
          </div>
          <p className="text-2xl font-extrabold text-ink text-center leading-relaxed m-0">
            {block === 'maxOther' ? S.tapBlock.switchToOther : S.tapBlock.switchToMax}
          </p>
          <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed m-0">
            {block === 'maxOther' ? S.tapBlock.switchToOtherDesc : S.tapBlock.maxInstr}
          </p>
        </div>
        <Button className="nm-blink" onClick={() => setPhase('countdown')}>
          {S.ready}
        </Button>
      </TestShell>
    );
  }

  return (
    <TestShell stepLabel={S.stepLabel(2)} title={S.tests.tapping.title} instruction={blockInstr}>
      <BlockChips block={block} />
      {(phase === 'running' || phase === 'countdown') && (
        <>
          {/* Rhythm dots — paced block only */}
          {isPaced ? (
            <div className="flex items-center justify-center gap-3.5 mt-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${phase === 'running' && beat % 4 === i ? 'bg-primary' : 'bg-[#F0C39E]'}`}
                />
              ))}
              <span className="text-base font-semibold text-muted ml-1.5">{S.rhythm}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center mt-4">
              <span className="text-lg font-extrabold text-primary-dark">{S.tapBlock.maxHint}</span>
            </div>
          )}

          {/* Tap target — visible during the countdown too, so the user sees
              exactly where to tap before the test starts */}
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="relative w-[230px] h-[230px] flex items-center justify-center">
              {phase === 'running' && isPaced && (
                <div className={`absolute inset-0 rounded-full bg-primary ${beat % 2 === 0 ? 'nm-beat-ring-a' : 'nm-beat-ring-b'}`} />
              )}
              <button
                onPointerDown={tap}
                disabled={phase !== 'running'}
                aria-label="แตะ"
                className={`relative w-[190px] h-[190px] rounded-full border-0 cursor-pointer flex flex-col items-center justify-center gap-1 select-none active:scale-95 transition-transform touch-none-important
                  bg-[radial-gradient(circle_at_38%_32%,#F2924E,#E8762C_60%,#D9681F)] shadow-[0_12px_30px_rgba(232,118,44,.4),inset_0_-6px_12px_rgba(0,0,0,.12)]
                  ${phase === 'running' && isPaced ? (beat % 2 === 0 ? 'nm-btn-pop-a' : 'nm-btn-pop-b') : ''}`}
              >
                <span className="text-4xl font-extrabold text-white">แตะ</span>
              </button>
              {/* demo hand bouncing on the target while counting down */}
              {phase === 'countdown' && (
                <span className="absolute text-6xl nm-demo-tap pointer-events-none" style={{ top: 6 }} aria-hidden="true">
                  👆
                </span>
              )}
            </div>
          </div>

          {/* Live counters */}
          {phase === 'running' && (
            <div className="flex gap-3 mb-2">
              <div className="flex-1 bg-white rounded-[18px] px-4 py-3.5 shadow-[0_3px_12px_rgba(35,58,77,.06)] flex flex-col items-center gap-0.5">
                <span className="font-num text-num-md font-black text-primary leading-none">{count}</span>
                <span className="text-base font-bold text-muted">{S.taps}</span>
              </div>
              <div className="flex-1 bg-white rounded-[18px] px-4 py-3.5 shadow-[0_3px_12px_rgba(35,58,77,.06)] flex flex-col items-center gap-0.5">
                <span className="font-num text-num-md font-black text-secondary leading-none">{secondsLeft}</span>
                <span className="text-base font-bold text-muted">{S.secondsLeft}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* the metronome preview plays only for the paced block */}
      {phase === 'countdown' && (
        <Countdown
          hint={isPaced ? S.countdownHints.tapping : S.tapBlock.maxInstr}
          beatMs={isPaced ? TAPPING.beatMs : undefined}
          onDone={begin}
        />
      )}
    </TestShell>
  );
}
