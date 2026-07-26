import { useEffect, useRef, useState } from 'react';
import LoudnessMeter, { createLevelTracker, rmsFromAnalyser, type LoudnessState } from '../LoudnessMeter';
import { S } from '../../lib/strings';

/**
 * Live voice spectrum plus the loudness meter with its target mark — the same
 * visuals the real test shows, but nothing is recorded, analysed or scored.
 * Seeing the bars respond is what tells an elderly user their voice is actually
 * being picked up, and practising against the target here means the first
 * attempt at the timed run is not the one that fails for being too quiet.
 */
export default function VoicePractice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const [state, setState] = useState<'starting' | 'live' | 'denied'>('starting');
  const barRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<LoudnessState>('quiet');
  const [level, setLevel] = useState<LoudnessState>('quiet');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // same constraints as the real test — with AGC on, a weak voice would
        // be normalised up here and the practised level would not transfer
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
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
        const timeBuf = new Uint8Array(analyser.fftSize);
        const tracker = createLevelTracker();
        const BAR_N = 24;

        const draw = () => {
          const { pct, state: next } = tracker.push(rmsFromAnalyser(analyser, timeBuf));
          if (barRef.current) barRef.current.style.width = `${pct}%`;
          if (next !== levelRef.current) {
            levelRef.current = next;
            setLevel(next);
          }

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
      <LoudnessMeter barRef={barRef} state={level} />
      <div className="w-full bg-white rounded-[20px] shadow-[0_4px_16px_rgba(35,58,77,.08)] px-4 py-4">
        <canvas ref={canvasRef} className="w-full h-[90px] block" aria-label={S.flow.practiceVoice} />
      </div>
      <p className="text-base font-semibold text-muted-2 text-center m-0">{S.voiceLevel.hint}</p>
    </div>
  );
}
