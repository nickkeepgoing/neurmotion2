import { useEffect, useRef, useState } from 'react';
import { S } from '../../lib/strings';

/**
 * Live voice spectrum with a "loud enough" target band — the same visual the
 * real test shows, but nothing is recorded, analysed or scored. Seeing the bars
 * respond is what tells an elderly user their voice is actually being picked up.
 */
export default function VoicePractice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const [state, setState] = useState<'starting' | 'live' | 'denied'>('starting');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        setState('live');

        let raf = 0;
        const canvas = canvasRef.current!;
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        const c2d = canvas.getContext('2d')!;
        const bins = new Uint8Array(analyser.frequencyBinCount);
        const BAR_N = 24;

        const draw = () => {
          analyser.getByteFrequencyData(bins);
          c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
          c2d.clearRect(0, 0, cw, ch);
          const bw = cw / BAR_N;
          c2d.fillStyle = '#BC5411';
          for (let i = 0; i < BAR_N; i++) {
            const v = (bins[i * 2] + bins[i * 2 + 1]) / 510;
            const h = Math.max(4, v * (ch - 8));
            const x = i * bw + bw * 0.18;
            const y = (ch - h) / 2;
            c2d.beginPath();
            if (typeof c2d.roundRect === 'function') c2d.roundRect(x, y, bw * 0.64, h, 4);
            else c2d.rect(x, y, bw * 0.64, h);
            c2d.fill();
          }
          raf = requestAnimationFrame(draw);
        };
        draw();

        stopRef.current = () => {
          cancelAnimationFrame(raf);
          analyser.disconnect();
          source.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          void ctx.close();
        };
      } catch {
        if (!cancelled) setState('denied');
      }
    })();
    return () => {
      cancelled = true;
      stopRef.current();
    };
  }, []);

  if (state === 'denied') {
    return <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed px-4">{S.flow.practiceNoMic}</p>;
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="w-full bg-white rounded-[20px] shadow-[0_4px_16px_rgba(35,58,77,.08)] px-4 py-4">
        <canvas ref={canvasRef} className="w-full h-[110px] block" aria-label={S.flow.practiceVoice} />
      </div>
      <p className="text-base font-semibold text-muted-2 text-center m-0">{S.flow.practiceVoice}</p>
    </div>
  );
}
