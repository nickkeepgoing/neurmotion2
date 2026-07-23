import { useEffect, useRef, useState } from 'react';
import { S } from '../../lib/strings';
import { requestMotionPermission } from '../../lib/tremor';

/**
 * Live bubble level, exactly as it appears in the real test but with no timer,
 * no capture and no scoring — so the user arrives at the scored run already
 * knowing what "hold it steady" looks like.
 */
export default function TremorPractice() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [state, setState] = useState<'starting' | 'live' | 'needsTap' | 'unsupported'>('starting');
  const tiltRef = useRef({ x: 0, y: 0 });
  const baseRef = useRef<{ x: number; y: number; n: number } | null>(null);
  const gotDataRef = useRef(false);

  const listen = () => {
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      gotDataRef.current = true;
      setState('live');
      const gx = a.x ?? 0;
      const gy = a.y ?? 0;
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
    return () => window.removeEventListener('devicemotion', onMotion);
  };

  useEffect(() => {
    const stop = listen();
    const ui = setInterval(() => setTilt({ ...tiltRef.current }), 100);
    // iOS needs requestPermission() from a user gesture, so if nothing arrives
    // we offer a button rather than silently showing a dead bubble
    const check = setTimeout(() => {
      if (!gotDataRef.current) setState(typeof DeviceMotionEvent === 'undefined' ? 'unsupported' : 'needsTap');
    }, 1500);
    return () => {
      stop();
      clearInterval(ui);
      clearTimeout(check);
    };
  }, []);

  const enable = async () => {
    const perm = await requestMotionPermission();
    setState(perm === 'granted' ? 'starting' : 'unsupported');
  };

  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const dx = clamp(-tilt.x / 2.5) * 70;
  const dy = clamp(tilt.y / 2.5) * 70;
  const dist = Math.hypot(dx, dy) / 70;
  const color = dist < 0.25 ? '#2E9E5B' : dist < 0.6 ? '#F1C232' : '#D64545';

  if (state === 'unsupported') {
    return <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed px-4">{S.flow.practiceNoSensor}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[200px] h-[200px]" aria-label={S.flow.practiceTremor}>
        <div className="absolute inset-0 rounded-full border-[3px] border-line bg-white shadow-[0_6px_22px_rgba(35,58,77,.08)]" />
        <div className="absolute inset-[36px] rounded-full border-2 border-dashed border-line" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[56px] h-[56px] rounded-full border-[3px] border-risk-low bg-risk-low-bg/60" />
        <div className="absolute left-1/2 top-3 bottom-3 w-px bg-line -translate-x-1/2" />
        <div className="absolute top-1/2 left-3 right-3 h-px bg-line -translate-y-1/2" />
        <div
          className="absolute left-1/2 top-1/2 w-10 h-10 rounded-full transition-transform duration-100 ease-out shadow-[0_4px_12px_rgba(35,58,77,.25)]"
          style={{ transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`, background: color }}
        />
      </div>

      {state === 'needsTap' ? (
        <button
          onClick={enable}
          className="min-h-14 px-6 rounded-[16px] bg-secondary text-white text-lg font-extrabold border-0 cursor-pointer"
        >
          {S.flow.practiceStart}
        </button>
      ) : (
        <p className="text-base font-semibold text-muted-2 text-center m-0">{S.flow.practiceTremor}</p>
      )}
    </div>
  );
}
