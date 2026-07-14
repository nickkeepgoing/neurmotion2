import { useEffect, useRef, useState } from 'react';
import { S } from '../lib/strings';

/**
 * Full-screen 3-2-1 countdown shown after every "start" press, with beeps,
 * so users have a moment to get their hand/face/phone ready.
 */
export default function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const audioRef = useRef<AudioContext | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    try {
      audioRef.current = new AudioContext();
    } catch {
      audioRef.current = null;
    }
    return () => {
      audioRef.current?.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const ctx = audioRef.current;
    if (ctx && ctx.state !== 'closed') {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = n === 0 ? 990 : 660; // higher pitch on "go"
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (n === 0 ? 0.25 : 0.12));
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch {
        /* audio unavailable — countdown still works visually */
      }
    }
    const id = setTimeout(() => (n === 0 ? doneRef.current() : setN(n - 1)), n === 0 ? 500 : 1000);
    return () => clearTimeout(id);
  }, [n]);

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex flex-col items-center justify-center gap-5" role="alert">
      <div className="w-40 h-40 rounded-full bg-white shadow-2xl flex items-center justify-center">
        <span className={`font-num font-black text-primary ${n === 0 ? 'text-4xl' : 'text-7xl'}`}>
          {n === 0 ? S.countdownGo : n}
        </span>
      </div>
      {n > 0 && <span className="text-2xl font-extrabold text-white">{S.countdownReady}</span>}
    </div>
  );
}
