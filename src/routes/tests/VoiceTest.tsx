import { useEffect, useRef, useState } from 'react';
import Countdown from '../../components/Countdown';
import LoudnessMeter, { levelPct, loudnessState, type LoudnessState } from '../../components/LoudnessMeter';
import PermissionDenied from '../../components/PermissionDenied';
import TestDone from '../../components/TestDone';
import TestIntro from '../../components/TestIntro';
import TestInvalid from '../../components/TestInvalid';
import TestShell from '../../components/TestShell';
import VoicePractice from '../../components/practice/VoicePractice';
import { ShieldIcon, VoiceIcon } from '../../components/icons';
import { useSettings } from '../../context/SettingsContext';
import { computeSubScore } from '../../lib/scoring';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { MIN_VALID, VOICE } from '../../lib/thresholds';
import { computeVoiceMetrics } from '../../lib/voice';

type Phase = 'intro' | 'countdown' | 'recording' | 'done' | 'error' | 'invalid';

/** Records ~5 s of raw PCM locally, analyzes, then discards the audio (PDPA). */
export default function VoiceTest() {
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('intro');
  const [secondsLeft, setSecondsLeft] = useState(VOICE.durationS);
  const [subScore, setSubScore] = useState(0);
  const stopRef = useRef<() => void>(() => {});
  const streamRef = useRef<MediaStream | null>(null);
  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const levelStateRef = useRef<LoudnessState>('quiet');
  const [levelState, setLevelState] = useState<LoudnessState>('quiet');

  useEffect(() => () => stopRef.current(), []);

  /** Ask for the mic first, then run the 3-2-1 countdown before recording. */
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      stopRef.current = () => stream.getTracks().forEach((t) => t.stop());
      setPhase('countdown');
    } catch {
      setPhase('error');
    }
  };

  const record = () => {
    try {
      const stream = streamRef.current!;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];

      processor.onaudioprocess = (e) => {
        chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(ctx.destination);

      // live frequency spectrum while the user says "ahh"
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      let raf = 0;
      const startSpectrum = () => {
        const canvas = spectrumRef.current;
        if (!canvas) return;
        const timeBuf = new Uint8Array(analyser.fftSize);
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        const c2d = canvas.getContext('2d')!;
        const bins = new Uint8Array(analyser.frequencyBinCount);
        const BAR_N = 28; // ~0–2.6 kHz at 48 kHz — where the voice energy lives
        const draw = () => {
          // RMS of the waveform → live loudness. The bar width is set on the
          // node directly; only the coarse state (quiet/good/loud) goes through
          // React, so a re-render happens on category change, not every frame.
          analyser.getByteTimeDomainData(timeBuf);
          let sum = 0;
          for (let i = 0; i < timeBuf.length; i++) {
            const v = (timeBuf[i] - 128) / 128; // byte domain is centred on 128
            sum += v * v;
          }
          const rms = Math.sqrt(sum / timeBuf.length);
          if (barRef.current) barRef.current.style.width = `${levelPct(rms)}%`;
          const next = loudnessState(rms);
          if (next !== levelStateRef.current) {
            levelStateRef.current = next;
            setLevelState(next);
          }

          analyser.getByteFrequencyData(bins);
          c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
          c2d.clearRect(0, 0, cw, ch);
          const bw = cw / BAR_N;
          c2d.fillStyle = '#E8762C';
          for (let i = 0; i < BAR_N; i++) {
            const v = (bins[i * 2] + bins[i * 2 + 1]) / 510; // 0–1
            const h = Math.max(5, v * (ch - 8));
            const x = i * bw + bw * 0.18;
            const y = (ch - h) / 2; // mirrored bars around the middle
            c2d.beginPath();
            if (typeof c2d.roundRect === 'function') c2d.roundRect(x, y, bw * 0.64, h, 4);
            else c2d.rect(x, y, bw * 0.64, h);
            c2d.fill();
          }
          raf = requestAnimationFrame(draw);
        };
        draw();
      };

      const cleanup = () => {
        cancelAnimationFrame(raf);
        analyser.disconnect();
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
      stopRef.current = cleanup;

      setSecondsLeft(VOICE.durationS);
      setPhase('recording');
      // canvas mounts on the next render
      requestAnimationFrame(startSpectrum);

      let left = VOICE.durationS;
      const tick = setInterval(() => {
        left -= 1;
        setSecondsLeft(left);
        if (left <= 0) {
          clearInterval(tick);
          cleanup();
          // stitch chunks and analyze
          const total = chunks.reduce((n, c) => n + c.length, 0);
          const pcm = new Float32Array(total);
          let off = 0;
          for (const c of chunks) {
            pcm.set(c, off);
            off += c.length;
          }
          const m = computeVoiceMetrics(pcm, ctx.sampleRate);
          // Silence / muted mic returns zeros, which normalise to a PERFECT
          // voice score. Require real phonation before scoring.
          if (m.voicedRatio < MIN_VALID.voiceVoicedRatio) {
            setPhase('invalid');
            return;
          }
          const metrics = { jitterPct: m.jitterPct, shimmerPct: m.shimmerPct, f0CV: m.f0CV, meanF0: m.meanF0, voicedRatio: m.voicedRatio };
          const score = computeSubScore('voice', metrics, settings.age);
          saveTestResult({ test: 'voice', metrics, subScore: score, timestamp: new Date().toISOString() }, settings.userType);
          setSubScore(score);
          setPhase('done');
        }
      }, 1000);
    } catch {
      setPhase('error');
    }
  };

  if (phase === 'done') {
    return (
      <TestShell stepLabel={S.advancedTest} advanced title={S.tests.voice.title}>
        <TestDone subScore={subScore} />
      </TestShell>
    );
  }

  if (phase === 'invalid') {
    return (
      <TestShell stepLabel={S.advancedTest} advanced title={S.tests.voice.title}>
        <TestInvalid test="voice" onRetry={start} />
      </TestShell>
    );
  }

  if (phase === 'error') {
    return (
      <TestShell stepLabel={S.advancedTest} advanced title={S.tests.voice.title}>
        <PermissionDenied kind="mic" test="voice" onRetry={start} />
      </TestShell>
    );
  }

  if (phase === 'intro') {
    return (
      <TestShell stepLabel={S.advancedTest} advanced title={S.tests.voice.title} instruction={S.tests.voice.instruction}>
        <TestIntro testId="voice" onStart={start} practice={<VoicePractice />} />
      </TestShell>
    );
  }

  return (
    <TestShell stepLabel={S.advancedTest} advanced title={S.tests.voice.title} instruction={S.tests.voice.instruction}>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
        {phase !== 'recording' && (
          <div className="relative w-[210px] h-[210px] flex items-center justify-center">
            <div className="absolute inset-4 rounded-full bg-primary-soft" />
            <div className="relative">
              <VoiceIcon size={90} />
            </div>
          </div>
        )}

        {phase === 'recording' && (
          <>
            {/* how loud to be — first, because it is the only thing on this
                screen the user can act on */}
            <LoudnessMeter barRef={barRef} state={levelState} />

            {/* live voice spectrum */}
            <div className="w-full bg-white rounded-[20px] shadow-[0_4px_16px_rgba(35,58,77,.08)] px-4 py-4">
              <canvas ref={spectrumRef} className="w-full h-[90px] block" aria-label="คลื่นความถี่เสียงของคุณ" />
            </div>
            <div className="flex items-center gap-5">
              <span className="font-num text-6xl font-black text-primary leading-none">{secondsLeft}</span>
              <p className="text-xl font-bold text-muted-2 m-0">{S.sayAhh}</p>
            </div>
          </>
        )}

      </div>

      <div className="flex items-start gap-2.5 bg-secondary-soft rounded-2xl px-4 py-3 mb-4">
        <span className="flex-none mt-0.5">
          <ShieldIcon />
        </span>
        <span className="text-base font-semibold text-[#2B5A7E] leading-relaxed">{S.voicePrivacy}</span>
      </div>

      {phase === 'countdown' && <Countdown hint={S.countdownHints.voice} onDone={record} />}
    </TestShell>
  );
}
