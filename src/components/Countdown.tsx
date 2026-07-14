import { useEffect, useRef, useState } from 'react';
import { S } from '../lib/strings';

/**
 * 3-2-1 countdown shown after every "start" press, with beeps.
 * - default: full-screen overlay
 * - inline: translucent overlay inside the parent (parent must be relative) —
 *   used over the camera preview so the user can position their face while waiting
 * `hint` tells the user how to get ready (e.g. "ยิ้มเตรียมไว้เลย").
 */
export default function Countdown({
  onDone,
  hint,
  inline = false,
}: {
  onDone: () => void;
  hint?: string;
  inline?: boolean;
}) {
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

  if (inline) {
    // light scrim so the camera preview stays visible behind the number
    return (
      <div className="absolute inset-0 z-10 bg-black/25 flex flex-col items-center justify-center gap-3 px-4" role="alert">
        <div className="w-24 h-24 rounded-full bg-white/95 shadow-xl flex items-center justify-center">
          <span className={`font-num font-black text-primary ${n === 0 ? 'text-2xl' : 'text-5xl'}`}>
            {n === 0 ? S.countdownGo : n}
          </span>
        </div>
        {hint && (
          <span className="text-lg font-bold text-white text-center leading-snug [text-shadow:0_1px_6px_rgba(0,0,0,.6)]">
            {hint}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex flex-col items-center justify-center gap-5 px-8" role="alert">
      <div className="w-40 h-40 rounded-full bg-white shadow-2xl flex items-center justify-center">
        <span className={`font-num font-black text-primary ${n === 0 ? 'text-4xl' : 'text-7xl'}`}>
          {n === 0 ? S.countdownGo : n}
        </span>
      </div>
      <span className="text-2xl font-extrabold text-white">{n > 0 ? S.countdownReady : ''}</span>
      {hint && <span className="text-xl font-bold text-white/90 text-center leading-relaxed">{hint}</span>}
    </div>
  );
}
