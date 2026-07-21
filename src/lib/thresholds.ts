/**
 * ALL tunable constants live here.
 *
 * IMPORTANT: these are provisional engineering defaults, chosen to produce a
 * sensible *relative* risk indicator for a demo. They are NOT clinically
 * validated and need calibration against real clinical data before any
 * medical use.
 *
 * Normalization model: each raw metric maps linearly from `good` (score 0)
 * to `bad` (score 100), clamped to [0, 100]. A test's sub-score is the
 * weighted mean of its metric scores; the overall score is the weighted mean
 * of completed tests' sub-scores.
 *
 * Sensitivity note (2569 tuning): the `bad` ends were tightened so that a
 * clearly-impaired attempt actually reaches the red band (>66), and small but
 * coherent tremor/impairment is picked up. Healthy performance should still
 * sit in green.
 */

export type MetricRange = { good: number; bad: number; weight: number };

export const METRIC_RANGES: Record<string, Record<string, MetricRange>> = {
  spiral: {
    // RMS radial error as a fraction of the gap between spiral turns (2πb).
    // Healthy tracing stays well under ~10% of the turn gap; ~30% is heavily
    // off-template (cf. digital spiral analysis literature).
    rmsErrorNorm: { good: 0.05, bad: 0.3, weight: 0.35 },
    // Fraction of radial-error signal power in the 4–7 Hz band —
    // the classic parkinsonian action-tremor band.
    tremorBandPower: { good: 0.03, bad: 0.2, weight: 0.3 },
    // Coefficient of variation of inter-turn spacing.
    spacingCV: { good: 0.08, bad: 0.35, weight: 0.15 },
    // Coefficient of variation of drawing speed (micrographia / hesitation).
    speedCV: { good: 0.35, bad: 1.0, weight: 0.2 },
  },
  tapping: {
    // Taps per second. Healthy index-finger tapping ≈ 4–6 Hz;
    // bradykinesia slows this markedly (<2 Hz concerning).
    rate: { good: 5, bad: 2, weight: 0.3 },
    // SD of inter-tap intervals (ms). Healthy rhythmic tapping ≈ 20–50 ms.
    itiSD: { good: 30, bad: 130, weight: 0.3 },
    // Slope of inter-tap interval over time (ms per tap). Positive slope =
    // progressive slowing = the bradykinesia "decrement" sign.
    decrementSlope: { good: 0, bad: 5, weight: 0.25 },
    // Mean absolute timing error vs the guided beat (ms).
    timingError: { good: 50, bad: 180, weight: 0.15 },
  },
  tremor: {
    // REST phase (forearm supported on a surface) — the most specific sign of
    // parkinsonian tremor: present at rest, 4–6 Hz.
    restBandPower: { good: 0.04, bad: 0.26, weight: 0.4 },
    restRms: { good: 0.02, bad: 0.3, weight: 0.2 },
    // POSTURAL phase (phone held up, arm unsupported) — action/postural tremor.
    posturalBandPower: { good: 0.05, bad: 0.3, weight: 0.25 },
    posturalRms: { good: 0.03, bad: 0.35, weight: 0.15 },
  },
  facial: {
    // Head-turn range of motion (total left + right, in degrees). Reduced ROM
    // or rigidity lowers this. Inverted range: more movement = healthier.
    turnRangeDeg: { good: 110, bad: 45, weight: 0.45 },
    // Left/right asymmetry of turn range (0–1). Weakness/neglect = asymmetric.
    turnAsymmetry: { good: 0.1, bad: 0.5, weight: 0.35 },
    // Jerkiness of the turn (CV of angular speed). Higher = less smooth.
    turnSmoothness: { good: 0.5, bad: 1.5, weight: 0.2 },
  },
  voice: {
    // Jitter: cycle-to-cycle F0 variation (%). Healthy sustained vowel <1%;
    // PD dysphonia typically elevated (cf. Little et al. 2009 telemonitoring).
    jitterPct: { good: 0.6, bad: 2.5, weight: 0.4 },
    // Shimmer: amplitude variation (%). Healthy <5%.
    shimmerPct: { good: 3.5, bad: 11, weight: 0.35 },
    // Coefficient of variation of F0 across the sustained vowel.
    f0CV: { good: 0.015, bad: 0.09, weight: 0.25 },
  },
};

/** Relative weight of each test in the overall score. */
export const TEST_WEIGHTS: Record<string, number> = {
  spiral: 0.3,
  tapping: 0.25,
  tremor: 0.2,
  facial: 0.15,
  voice: 0.1,
};

/** Overall score → risk level cut points (tunable). */
export const RISK_CUTS = { lowMax: 33, mediumMax: 66 };

/** Consecutive high-risk days that trigger the "see a doctor" alert. */
export const RISK_STREAK_DAYS = 5;

/** Parkinsonian tremor frequency band (Hz), used by spiral + tremor tests. */
export const TREMOR_BAND = { lo: 4, hi: 7 };

/** Tapping test: guided beat interval (ms) and test duration (s). */
export const TAPPING = { beatMs: 500, durationS: 10 };

/**
 * Tremor test: two phases, each captured for `phaseS` seconds at `sampleHz`.
 * Higher sample rate + longer capture = finer spectral resolution, so small
 * but coherent tremor is detectable.
 */
export const TREMOR = { phaseS: 8, sampleHz: 60 };

/** Facial head-turn test: seconds to capture the left+right turn. */
export const FACIAL = { captureS: 6, minTurnDeg: 20 };

/** Voice test: recording duration (s). */
export const VOICE = { durationS: 5 };
