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
    // Taps per second in the UNPACED maximal block, taken from the slower hand.
    // Healthy maximal index-finger tapping ≈ 4–6 Hz; bradykinesia slows this
    // markedly. (Scored only from the maximal block — under a metronome every
    // compliant user taps at the metronome's rate, which is why this metric
    // previously pinned everyone at 100/100.)
    rate: { good: 5, bad: 2, weight: 0.25 },
    // SD of inter-tap intervals in the PACED block (ms). Healthy ≈ 20–50 ms.
    itiSD: { good: 30, bad: 130, weight: 0.2 },
    // Slope of inter-tap interval over the maximal block (ms per tap).
    // Positive = progressive slowing = the bradykinesia "decrement" sign.
    decrementSlope: { good: 0, bad: 5, weight: 0.2 },
    // Mean absolute timing error vs the guided beat (ms).
    timingError: { good: 50, bad: 180, weight: 0.15 },
    // Left/right difference in maximal rate (0–1). Early Parkinson's is
    // markedly asymmetric, so a large gap between hands is itself a sign.
    asymmetry: { good: 0.1, bad: 0.45, weight: 0.2 },
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

/**
 * Minimum data required before a test result may be SCORED AND SAVED.
 *
 * Safety rule: an attempt that produced too little data must be reported as
 * "ทำไม่สำเร็จ — ลองใหม่", never scored. Previously the metric functions
 * returned zeros on insufficient data, and zero normalises to the *healthy*
 * end — so "the test didn't work" and "you are fine" were indistinguishable
 * to the user (and, for the facial test, no data scored as high risk).
 */
export const MIN_VALID = {
  /** taps needed for inter-tap-interval statistics to mean anything */
  tappingCount: 6,
  /** accelerometer samples required in EACH of the two tremor phases */
  tremorSamplesPerPhase: 20,
  /** fraction of voice frames that must contain detectable phonation */
  voiceVoicedRatio: 0.25,
  /** face-landmark frames required for the head-turn test */
  facialFrames: 30,
  /** fraction of the spiral that must actually be traced */
  spiralCoverage: 0.7,
};

/**
 * Age adjustment.
 *
 * Fine-motor speed, timing variability, cervical range of motion and voice
 * stability all decline with normal ageing. A single fixed cut point therefore
 * over-flags the old and under-flags the young — and this app's target users
 * are 60+. For each metric below, the `good` anchor is shifted toward `bad` by
 * this FRACTION OF THE GOOD→BAD SPAN for every decade above AGE_REF, so a
 * healthy 80-year-old is compared against what is normal at 80.
 *
 * Values are conservative engineering estimates, not calibrated norms, and are
 * capped at AGE_MAX_DECADES so the scale can never be widened into uselessness.
 */
export const AGE_REF = 60;
export const AGE_MAX_DECADES = 3; // no further leniency past ~90

export const AGE_SHIFT: Record<string, Record<string, number>> = {
  spiral: { rmsErrorNorm: 0.1, tremorBandPower: 0.06, spacingCV: 0.08, speedCV: 0.1 },
  // maximal tapping rate falls roughly 5–8% per decade in healthy adults
  tapping: { rate: 0.12, itiSD: 0.12, decrementSlope: 0.08, timingError: 0.1, asymmetry: 0.05 },
  tremor: { restBandPower: 0.06, restRms: 0.08, posturalBandPower: 0.08, posturalRms: 0.1 },
  // cervical rotation declines markedly with age and cervical spondylosis
  facial: { turnRangeDeg: 0.14, turnAsymmetry: 0.06, turnSmoothness: 0.1 },
  voice: { jitterPct: 0.12, shimmerPct: 0.12, f0CV: 0.1 },
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

/**
 * A single test scoring at or above this is a "red flag": the overall risk may
 * not be reported as low, however good the other tests were.
 *
 * Rationale: the overall score is a weighted mean, which is compensatory. A
 * textbook ISOLATED rest tremor — the most specific parkinsonian sign this app
 * measures — would be averaged away by four normal tests and reported as low
 * risk. Clinical parkinsonism is domain-selective and asymmetric early on, so
 * a purely averaged model only fires once the disease is advanced enough to
 * affect everything, which is exactly the population that no longer needs
 * screening.
 */
export const RED_FLAG_SUBSCORE = 80;

/** Consecutive high-risk days that trigger the "see a doctor" alert. */
export const RISK_STREAK_DAYS = 5;

/** Parkinsonian tremor frequency band (Hz), used by spiral + tremor tests. */
export const TREMOR_BAND = { lo: 4, hi: 7 };

/** Tapping test: guided beat interval (ms) and duration (s) of each block. */
export const TAPPING = { beatMs: 500, durationS: 10 };

/**
 * Tremor test: two phases, each captured for `phaseS` seconds at `sampleHz`.
 * Higher sample rate + longer capture = finer spectral resolution, so small
 * but coherent tremor is detectable.
 */
export const TREMOR = { phaseS: 8, sampleHz: 60 };

/**
 * Facial head-turn test. `timeoutS` is generous because an elderly user may
 * need several attempts to reach full rotation; running out of time means the
 * attempt is INCOMPLETE, not that the result is bad.
 */
export const FACIAL = {
  captureS: 6,
  timeoutS: 25,
  minTurnDeg: 20,
  /** ms the head must stay past minTurnDeg for that side to count — stops a
   *  fast swing from ticking a side off the instant it passes through */
  holdMs: 600,
  /** within this many degrees of the start pose counts as "facing forward" */
  centerDeg: 8,
};

/** Voice test: recording duration (s). */
export const VOICE = { durationS: 5 };

/**
 * Live loudness guide for the voice test, as RMS amplitude of the mic signal
 * (0–1). Without a visible target people phonate too quietly, the recording
 * fails the voicing gate, and they have to redo the whole test.
 *
 * These are SIGNAL levels, not calibrated sound-pressure levels — browsers
 * expose no absolute SPL and every phone has a different mic gain, so this
 * meter tells the user "louder / that's enough", nothing more. It must never
 * be presented as a measurement of their voice volume, which is why loudness
 * is not scored (true hypophonia measurement needs a calibrated setup).
 *
 * getUserMedia is opened with autoGainControl:false so the levels stay
 * comparable within a device; AGC would silently normalise a weak voice up.
 */
export const VOICE_LEVEL = {
  /** entering the target band — loud enough for stable jitter/shimmer */
  goodRms: 0.05,
  /** approaching clipping, which corrupts the amplitude metrics */
  loudRms: 0.3,
  /**
   * The bar is drawn on a decibel scale. Loudness is perceived
   * logarithmically, and on a linear RMS scale these thresholds crowd the left
   * edge — the target mark sat at 11 % of the bar, so a perfectly good "ahh"
   * still looked nearly empty. In dB the mark lands mid-bar.
   */
  floorDb: -50,
  ceilDb: -6,
};
