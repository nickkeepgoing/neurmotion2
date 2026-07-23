/**
 * Finger tapping — metrics from tap timestamps (performance.now(), ms).
 *
 * The test runs in three blocks, following MDS-UPDRS 3.4's structure:
 *   1. PACED   (dominant hand) — tap in time with a metronome. Measures rhythm
 *      accuracy, which a self-paced block cannot.
 *   2. MAXIMAL (dominant hand) — "as fast as you can". Rate and the bradykinesia
 *      decrement are only meaningful here: under a metronome everyone taps at
 *      the metronome's rate, and the beat holds them there, suppressing the
 *      progressive slowing the decrement is meant to detect.
 *   3. MAXIMAL (other hand)    — early Parkinson's is markedly asymmetric, so
 *      the difference between hands is one of the most discriminating signals
 *      available. Scoring only one hand throws it away.
 */
import { linearSlope, mean, std } from './fft';
import { TAPPING } from './thresholds';

export type BlockMetrics = {
  rate: number; // taps per second
  itiSD: number; // SD of inter-tap intervals (ms)
  decrementSlope: number; // ms of slowing per tap (bradykinesia decrement)
  timingError: number; // mean abs error vs the guided beat grid (ms)
  count: number;
};

export function computeBlockMetrics(taps: number[], durationS = TAPPING.durationS): BlockMetrics {
  if (taps.length < 3) {
    return { rate: 0, itiSD: 0, decrementSlope: 0, timingError: 0, count: taps.length };
  }

  const itis: number[] = [];
  for (let i = 1; i < taps.length; i++) itis.push(taps[i] - taps[i - 1]);

  const rate = taps.length / durationS;
  const itiSD = std(itis);
  // positive slope = intervals growing = slowing down over the block
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

/** Backwards-compatible alias for the single-block computation. */
export const computeTappingMetrics = computeBlockMetrics;

export type TappingMetrics = {
  rate: number;
  itiSD: number;
  decrementSlope: number;
  timingError: number;
  asymmetry: number;
  count: number;
};

/**
 * Combine the three blocks into the scored metric set.
 *
 * Rhythm comes from the paced block; speed and decrement from the WORSE of the
 * two maximal blocks (screening should follow the more affected side, since
 * that is the side disease shows on first); asymmetry from the difference
 * between them, normalised by the better side.
 */
export function combineTapping(
  pacedTaps: number[],
  maxDominantTaps: number[],
  maxOtherTaps: number[],
  durationS = TAPPING.durationS
): TappingMetrics {
  const paced = computeBlockMetrics(pacedTaps, durationS);
  const domi = computeBlockMetrics(maxDominantTaps, durationS);
  const other = computeBlockMetrics(maxOtherTaps, durationS);

  // "worse" = slower; if a hand was not tested, fall back to the one that was
  const rates = [domi.rate, other.rate].filter((r) => r > 0);
  const slowest = rates.length ? Math.min(...rates) : 0;
  const fastest = rates.length ? Math.max(...rates) : 0;
  const worseBlock = domi.rate > 0 && domi.rate <= (other.rate || Infinity) ? domi : other.rate > 0 ? other : domi;

  return {
    rate: slowest,
    decrementSlope: Math.max(domi.decrementSlope, other.decrementSlope),
    itiSD: paced.itiSD || worseBlock.itiSD,
    timingError: paced.timingError,
    // 0 = both hands equal, 1 = one hand cannot tap at all
    asymmetry: fastest > 0 && rates.length === 2 ? (fastest - slowest) / fastest : 0,
    count: paced.count + domi.count + other.count,
  };
}
