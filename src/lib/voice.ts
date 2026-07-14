/**
 * Voice ("ahh") test — jitter / shimmer / F0 stability from raw PCM.
 *
 * Demo-grade analysis: the signal is cut into 40 ms frames (20 ms hop).
 * Each frame's F0 is estimated by normalized autocorrelation (70–400 Hz).
 * - jitter  = mean |ΔT| between consecutive voiced-frame periods / mean T
 * - shimmer = mean |ΔA| between consecutive frame RMS amplitudes / mean A
 * - f0CV    = coefficient of variation of F0 across voiced frames
 */
import { cv, mean } from './fft';

export type VoiceMetrics = {
  jitterPct: number;
  shimmerPct: number;
  f0CV: number;
  meanF0: number; // Hz, informational
  voicedRatio: number; // fraction of frames with detectable pitch
};

const F_MIN = 70;
const F_MAX = 400;

function frameF0(frame: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / F_MAX);
  const maxLag = Math.min(Math.floor(sampleRate / F_MIN), frame.length - 1);
  let energy = 0;
  for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
  if (energy < 1e-6) return 0; // silence

  let bestLag = 0;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < frame.length - lag; i++) corr += frame[i] * frame[i + lag];
    corr /= energy;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  // require a reasonably periodic frame
  return bestCorr > 0.5 && bestLag > 0 ? sampleRate / bestLag : 0;
}

export function computeVoiceMetrics(pcm: Float32Array, sampleRate: number): VoiceMetrics {
  const frameLen = Math.floor(sampleRate * 0.04);
  const hop = Math.floor(sampleRate * 0.02);

  const f0s: number[] = [];
  const amps: number[] = [];
  for (let start = 0; start + frameLen <= pcm.length; start += hop) {
    const frame = pcm.subarray(start, start + frameLen);
    let rms = 0;
    for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i];
    rms = Math.sqrt(rms / frame.length);
    const f0 = frameF0(frame, sampleRate);
    f0s.push(f0);
    amps.push(rms);
  }

  const voiced = f0s.map((f, i) => ({ f, a: amps[i] })).filter((x) => x.f > 0 && x.a > 0.005);
  const voicedRatio = f0s.length ? voiced.length / f0s.length : 0;
  if (voiced.length < 10) {
    return { jitterPct: 0, shimmerPct: 0, f0CV: 0, meanF0: 0, voicedRatio };
  }

  const periods = voiced.map((x) => 1 / x.f);
  const dT: number[] = [];
  for (let i = 1; i < periods.length; i++) dT.push(Math.abs(periods[i] - periods[i - 1]));
  const jitterPct = (mean(dT) / mean(periods)) * 100;

  const vAmps = voiced.map((x) => x.a);
  const dA: number[] = [];
  for (let i = 1; i < vAmps.length; i++) dA.push(Math.abs(vAmps[i] - vAmps[i - 1]));
  const shimmerPct = (mean(dA) / mean(vAmps)) * 100;

  const f0CV = cv(voiced.map((x) => x.f));
  const meanF0 = mean(voiced.map((x) => x.f));

  return { jitterPct, shimmerPct, f0CV, meanF0, voicedRatio };
}
