/**
 * Differential pattern indicator for the three tremor syndromes this app
 * screens for. NOT a diagnosis — it turns the raw movement features into a
 * "which pattern does this most resemble" score, to be confirmed by a doctor.
 *
 *   Parkinsonian syndrome  — REST tremor (limb supported), bradykinesia
 *                            (slow / decrementing tapping), asymmetric onset,
 *                            reduced range of movement, spiral abnormality.
 *   Essential tremor       — POSTURAL / ACTION tremor, bilateral & roughly
 *                            symmetric, no rest tremor, no bradykinesia; often
 *                            a vocal tremor and a tremulous spiral.
 *   Enhanced physiological  — a fine, LOW-amplitude postural tremor (stress,
 *   tremor                   caffeine, fatigue); everything else normal.
 *
 * The weights are engineering heuristics derived from those textbook
 * distinctions; they are provisional and unvalidated.
 */
import { ageAdjustedRange, normalizeMetric } from './scoring';
import { METRIC_RANGES, RISK_CUTS } from './thresholds';
import type { RiskLevel, TestId, TestResult } from './types';

export type ConditionId = 'parkinsonian' | 'essential' | 'physiological';

export type ConditionScore = {
  id: ConditionId;
  score: number; // 0–100, higher = pattern more present
  level: RiskLevel;
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** Feature value 0–1 for a metric (0 = normal, 1 = fully abnormal). Missing → 0. */
function feat(map: Partial<Record<TestId, Record<string, number>>>, test: TestId, metric: string, age?: number): number {
  const v = map[test]?.[metric];
  if (v == null) return 0;
  const base = METRIC_RANGES[test]?.[metric];
  if (!base) return 0;
  const r = ageAdjustedRange(test, metric, base, age);
  return normalizeMetric(v, r.good, r.bad) / 100;
}

function level(score: number): RiskLevel {
  if (score <= RISK_CUTS.lowMax) return 'low';
  if (score <= RISK_CUTS.mediumMax) return 'medium';
  return 'high';
}

/** Which tests inform the differential; the tremor test is the key one. */
export const CONDITION_TESTS: TestId[] = ['tremor', 'tapping', 'spiral', 'facial', 'voice'];

/**
 * Score all three conditions from a session's results, most likely first.
 * `enoughData` is false when too little was captured to say anything useful
 * (the tremor test, the main discriminator, is required).
 */
export function assessConditions(results: TestResult[], age?: number): { scores: ConditionScore[]; enoughData: boolean } {
  const map: Partial<Record<TestId, Record<string, number>>> = {};
  for (const r of results) map[r.test] = r.metrics;

  // --- movement features (0–1) ---
  const rest = (feat(map, 'tremor', 'restBandPower', age) + feat(map, 'tremor', 'restRms', age)) / 2;
  const postural = (feat(map, 'tremor', 'posturalBandPower', age) + feat(map, 'tremor', 'posturalRms', age)) / 2;
  const postAmp = feat(map, 'tremor', 'posturalRms', age); // amplitude only (ET vs EPT splitter)
  const brady = (feat(map, 'tapping', 'rate', age) + feat(map, 'tapping', 'decrementSlope', age)) / 2;
  const asym = Math.max(feat(map, 'tapping', 'asymmetry', age), feat(map, 'facial', 'turnAsymmetry', age));
  const romLoss = feat(map, 'facial', 'turnRangeDeg', age);
  const spiralTremor = feat(map, 'spiral', 'tremorBandPower', age);
  const spiralErr = feat(map, 'spiral', 'rmsErrorNorm', age);
  const voiceTremor = feat(map, 'voice', 'f0CV', age);

  // --- Parkinsonian: rest tremor + bradykinesia + asymmetry are the hallmarks ---
  let pd = 0.32 * rest + 0.28 * brady + 0.18 * asym + 0.12 * romLoss + 0.1 * spiralErr;
  // rest-predominant (rest > postural) is the classic parkinsonian pattern
  pd *= 1 + 0.15 * clamp(rest - postural);

  // --- Essential tremor: postural/action tremor, symmetric, no rest/brady ---
  let et = 0.36 * postural + 0.24 * spiralTremor + 0.2 * voiceTremor + 0.2 * postAmp;
  et *= (1 - 0.5 * rest) * (1 - 0.4 * brady) * (1 - 0.2 * asym); // rest/brady/asymmetry point away from ET

  // --- Enhanced physiological: postural tremor PRESENT but fine (low amplitude) ---
  let ept = 0.7 * (postural * (1 - postAmp)) + 0.3 * (spiralTremor * (1 - spiralErr));
  ept *= (1 - 0.6 * rest) * (1 - 0.5 * brady) * (1 - 0.3 * asym);

  const raw: { id: ConditionId; score: number }[] = [
    { id: 'parkinsonian', score: Math.round(clamp(pd) * 100) },
    { id: 'essential', score: Math.round(clamp(et) * 100) },
    { id: 'physiological', score: Math.round(clamp(ept) * 100) },
  ];
  const scores: ConditionScore[] = raw.map((c) => ({ ...c, level: level(c.score) }));

  scores.sort((a, b) => b.score - a.score);
  const enoughData = !!map.tremor && CONDITION_TESTS.filter((t) => map[t]).length >= 2;
  return { scores, enoughData };
}
