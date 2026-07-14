import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Countdown from '../../components/Countdown';
import TestDemo from '../../components/TestDemo';
import TestDone from '../../components/TestDone';
import TestShell from '../../components/TestShell';
import Button from '../../components/ui/Button';
import { ShieldIcon, VoiceIcon } from '../../components/icons';
import { useSettings } from '../../context/SettingsContext';
import { computeSubScore } from '../../lib/scoring';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { VOICE } from '../../lib/thresholds';
import { computeVoiceMetrics } from '../../lib/voice';

type Phase = 'ready' | 'countdown' | 'recording' | 'done' | 'error';

/** Records ~5 s of raw PCM locally, analyzes, then discards the audio (PDPA). */
export default function VoiceTest() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState(VOICE.durationS);
  const [level, setLevel] = useState(0);
  const [subScore, setSubScore] = useState(0);
  const stopRef = useRef<() => void>(() => {});
  const streamRef = useRef<MediaStream | null>(null);

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
        const data = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(data));
        // live level meter
        let rms = 0;
        for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
        setLevel(Math.min(1, Math.sqrt(rms / data.length) * 8));
      };
      source.connect(processor);
      processor.connect(ctx.destination);

      const cleanup = () => {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
      stopRef.current = cleanup;

      setSecondsLeft(VOICE.durationS);
      setPhase('recording');

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
          const metrics = { jitterPct: m.jitterPct, shimmerPct: m.shimmerPct, f0CV: m.f0CV, meanF0: m.meanF0, voicedRatio: m.voicedRatio };
          const score = computeSubScore('voice', metrics);
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

  return (
    <TestShell
      stepLabel={S.advancedTest}
      advanced
      title={S.tests.voice.title}
      instruction={S.tests.voice.instruction}
      demo={phase === 'ready' ? <TestDemo test="voice" /> : undefined}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
        <div className="relative w-[210px] h-[210px] flex items-center justify-center">
          {phase === 'recording' && (
            <div
              className="absolute inset-0 rounded-full bg-primary transition-transform duration-100"
              style={{ opacity: 0.15 + level * 0.35, transform: `scale(${1 + level * 0.25})` }}
            />
          )}
          <div className="absolute inset-4 rounded-full bg-primary-soft" />
          <div className="relative">
            <VoiceIcon size={90} />
          </div>
        </div>

        {phase === 'recording' && (
          <>
            <span className="font-num text-6xl font-black text-primary leading-none">{secondsLeft}</span>
            <p className="text-xl font-bold text-muted-2">{S.sayAhh}</p>
          </>
        )}

        {phase === 'error' && (
          <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed px-2">{S.permissionDenied}</p>
        )}
      </div>

      <div className="flex items-start gap-2.5 bg-secondary-soft rounded-2xl px-4 py-3 mb-4">
        <span className="flex-none mt-0.5">
          <ShieldIcon />
        </span>
        <span className="text-base font-semibold text-[#2B5A7E] leading-relaxed">{S.voicePrivacy}</span>
      </div>

      {phase === 'ready' && (
        <Button className="nm-blink" onClick={start}>
          {S.ready}
        </Button>
      )}
      {phase === 'error' && (
        <Button variant="outline" onClick={() => navigate('/home')}>
          {S.skip}
        </Button>
      )}

      {phase === 'countdown' && <Countdown onDone={record} />}
    </TestShell>
  );
}
