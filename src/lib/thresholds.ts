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
 */

export type MetricRange = { good: number; bad: number; weight: number };

export const METRIC_RANGES: Record<string, Record<string, MetricRange>> = {
  spiral: {
    // RMS radial error as a fraction of the gap between spiral turns (2πb).
    // Healthy tracing stays well under ~15% of the turn gap; >50% is heavily
    // off-template (cf. digital spiral analysis literature, e.g. Saunders-
    // Pullman et al. on spiral scoring).
    rmsErrorNorm: { good: 0.08, bad: 0.5, weight: 0.35 },
    // Fraction of radial-error signal power in the 4–7 Hz band —
    // the classic parkinsonian action-tremor band.
    tremorBandPower: { good: 0.05, bad: 0.35, weight: 0.3 },
    // Coefficient of variation of inter-turn spacing.
    spacingCV: { good: 0.1, bad: 0.5, weight: 0.15 },
    // Coefficient of variation of drawing speed (micrographia / hesitation).
    speedCV: { good: 0.4, bad: 1.4, weight: 0.2 },
  },
  tapping: {
    // Taps per second. Healthy index-finger tapping ≈ 4–6 Hz;
    // bradykinesia slows this markedly (<2 Hz concerning).
    rate: { good: 4, bad: 1.5, weight: 0.3 },
    // SD of inter-tap intervals (ms). Healthy rhythmic tapping ≈ 20–50 ms.
    itiSD: { good: 40, bad: 200, weight: 0.3 },
    // Slope of inter-tap interval over time (ms per tap). Positive slope =
    // progressive slowing = the bradykinesia "decrement" sign.
    decrementSlope: { good: 0, bad: 8, weight: 0.25 },
    // Mean absolute timing error vs the guided beat (ms).
    timingError: { good: 60, bad: 250, weight: 0.15 },
  },
  tremor: {
    // Fraction of accelerometer power in 4–7 Hz band (rest tremor band).
    tremorBandPower: { good: 0.08, bad: 0.45, weight: 0.6 },
    // RMS acceleration (m/s²) while "holding still".
    rmsAccel: { good: 0.05, bad: 0.6, weight: 0.4 },
  },
  facial: {
    // Peak smile amplitude (MediaPipe blendshape 0–1). Hypomimia = low.
    smileAmplitude: { good: 0.75, bad: 0.2, weight: 0.45 },
    // Left/right smile asymmetry (0–1, relative to amplitude).
    asymmetry: { good: 0.08, bad: 0.45, weight: 0.3 },
    // Overall facial movement (mean frame-to-frame blendshape delta).
    movement: { good: 0.02, bad: 0.003, weight: 0.25 },
  },
  voice: {
    // Jitter: cycle-to-cycle F0 variation (%). Healthy sustained vowel <1%;
    // PD dysphonia typically elevated (cf. Little et al. 2009 telemonitoring).
    jitterPct: { good: 0.8, bad: 3.5, weight: 0.4 },
    // Shimmer: amplitude variation (%). Healthy <5%.
    shimmerPct: { good: 4, bad: 15, weight: 0.35 },
    // Coefficient of variation of F0 across the sustained vowel.
    f0CV: { good: 0.02, bad: 0.12, weight: 0.25 },
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

/** Parkinsonian tremor frequency band (Hz), used by spiral + tremor tests. */
export const TREMOR_BAND = { lo: 4, hi: 7 };

/** Tapping test: guided beat interval (ms) and test duration (s). */
export const TAPPING = { beatMs: 500, durationS: 10 };

/** Tremor test capture duration (s) and resample rate (Hz). */
export const TREMOR = { durationS: 10, sampleHz: 50 };

/** Facial test: seconds the smile must be held. */
export const FACIAL = { holdS: 3 };

/** Voice test: recording duration (s). */
export const VOICE = { durationS: 5 };
