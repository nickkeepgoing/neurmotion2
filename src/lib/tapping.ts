/**
 * Finger tapping test — metrics from tap timestamps (performance.now(), ms).
 * The user taps along to a guided beat (TAPPING.beatMs).
 */
import { linearSlope, mean, std } from './fft';
import { TAPPING } from './thresholds';

export type TappingMetrics = {
  rate: number; // taps per second
  itiSD: number; // SD of inter-tap intervals (ms)
  decrementSlope: number; // ms of slowing per tap (bradykinesia decrement)
  timingError: number; // mean abs error vs guided beat grid (ms)
  count: number;
};

export function computeTappingMetrics(taps: number[], durationS = TAPPING.durationS): TappingMetrics {
  if (taps.length < 3) {
    return { rate: 0, itiSD: 0, decrementSlope: 0, timingError: 0, count: taps.length };
  }

  const itis: number[] = [];
  for (let i = 1; i < taps.length; i++) itis.push(taps[i] - taps[i - 1]);

  const rate = taps.length / durationS;
  const itiSD = std(itis);
  // positive slope = intervals growing = slowing down over the test
  const decrementSlope = linearSlope(itis);

  // timing error vs an ideal beat grid anchored at the first tap
  const beat = TAPPING.beatMs;
  const errs = taps.map((t) => {
    const phase = (t - taps[0]) % beat;
    return Math.min(phase, beat - phase);
  });
  const timingError = mean(errs);

  return { rate, itiSD, decrementSlope, timingError, count: taps.length };
}
