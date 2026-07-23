import { useEffect, useRef, useState } from 'react';
import { S } from '../../lib/strings';
import { TAPPING } from '../../lib/thresholds';

/**
 * Practice tap target: plays the metronome and lets the user tap freely,
 * with no timer or scoring — just to get the feel of the rhythm.
 */
export default function TapPractice() {
  const [beat, setBeat] = useState(0);
  const [count, setCount] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioRef.current = new AudioContext();
    void audioRef.current.resume();
    const id = setInterval(() => {
      setBeat((b) => {
        const ctx = audioRef.current;
        if (ctx && ctx.state !== 'closed') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = b % 4 === 3 ? 880 : 660;
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
        }
        return b + 1;
      });
    }, TAPPING.beatMs);
    return () => {
      clearInterval(id);
      audioRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-colors ${beat % 4 === i ? 'bg-primary' : 'bg-[#F0C39E]'}`} />
        ))}
        <span className="text-base font-semibold text-muted ml-1">{S.rhythm}</span>
      </div>

      <div className="relative w-[190px] h-[190px] flex items-center justify-center">
        <div className={`absolute inset-0 rounded-full bg-primary ${beat % 2 === 0 ? 'nm-beat-ring-a' : 'nm-beat-ring-b'}`} />
        <button
          onPointerDown={() => setCount((c) => c + 1)}
          aria-label="ลองแตะ"
          className={`relative w-[160px] h-[160px] rounded-full border-0 cursor-pointer flex flex-col items-center justify-center select-none active:scale-95 transition-transform touch-none-important
            bg-[radial-gradient(circle_at_38%_32%,#F2924E,#E8762C_60%,#D9681F)] shadow-[0_12px_30px_rgba(232,118,44,.4),inset_0_-6px_12px_rgba(0,0,0,.12)]
            ${beat % 2 === 0 ? 'nm-btn-pop-a' : 'nm-btn-pop-b'}`}
        >
          <span className="text-2xl font-extrabold text-white">แตะ</span>
        </button>
      </div>

      <p className="text-base font-semibold text-muted-2">{S.flow.practiceTapping}</p>
      <span className="font-num text-2xl font-black text-primary">{count}</span>
    </div>
  );
}
