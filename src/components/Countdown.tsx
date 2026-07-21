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
  beatMs,
}: {
  onDone: () => void;
  hint?: string;
  inline?: boolean;
  /** If set, play a metronome tick every `beatMs` during the countdown so the
   *  user hears the rhythm before the real test starts (tapping test). */
  beatMs?: number;
}) {
  const [n, setN] = useState(3);
  const audioRef = useRef<AudioContext | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const tick = (freq: number, dur: number, vol: number) => {
    const ctx = audioRef.current;
    if (!ctx || ctx.state === 'closed') return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch {
      /* audio unavailable — countdown still works visually */
    }
  };

  useEffect(() => {
    try {
      audioRef.current = new AudioContext();
      void audioRef.current.resume();
    } catch {
      audioRef.current = null;
    }
    // metronome preview: tick at the beat while counting down
    let beatId: ReturnType<typeof setInterval> | undefined;
    if (beatMs) {
      tick(660, 0.08, 0.1);
      beatId = setInterval(() => tick(660, 0.08, 0.1), beatMs);
    }
    return () => {
      if (beatId) clearInterval(beatId);
      audioRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // the number "voice" beep (skip when a metronome is already ticking, to
    // avoid doubled sounds on the tapping test)
    if (!beatMs) tick(n === 0 ? 990 : 660, n === 0 ? 0.25 : 0.12, 0.15);
    else if (n === 0) tick(990, 0.25, 0.15);
    const id = setTimeout(() => (n === 0 ? doneRef.current() : setN(n - 1)), n === 0 ? 500 : 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // light scrim so the test screen behind (tap target, spiral, …) stays
  // visible as a preview while the user gets ready
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex flex-col items-center justify-between py-10 px-8 pointer-events-none" role="alert">
      <div className="w-32 h-32 rounded-full bg-white shadow-2xl flex items-center justify-center mt-2">
        <span className={`font-num font-black text-primary ${n === 0 ? 'text-3xl' : 'text-6xl'}`}>
          {n === 0 ? S.countdownGo : n}
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        {n > 0 && (
          <span className="text-2xl font-extrabold text-white [text-shadow:0_1px_8px_rgba(0,0,0,.7)]">{S.countdownReady}</span>
        )}
        {hint && (
          <span className="text-xl font-bold text-white text-center leading-relaxed [text-shadow:0_1px_8px_rgba(0,0,0,.7)]">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
