/**
 * Scoring: raw metrics → 0–100 sub-scores → overall score → risk level.
 * All ranges/weights live in thresholds.ts. Higher score = more concerning.
 */
import { METRIC_RANGES, RISK_CUTS, TEST_WEIGHTS } from './thresholds';
import type { RiskLevel, TestId, TestResult } from './types';

/** Linear map from `good` (0) to `bad` (100), clamped. Handles inverted ranges. */
export function normalizeMetric(value: number, good: number, bad: number): number {
  const raw = ((value - good) / (bad - good)) * 100;
  return Math.min(100, Math.max(0, raw));
}

/** Weighted sub-score for one test from its raw metrics. */
export function computeSubScore(test: TestId, metrics: Record<string, number>): number {
  const ranges = METRIC_RANGES[test];
  let sum = 0;
  let wsum = 0;
  for (const [name, range] of Object.entries(ranges)) {
    if (!(name in metrics)) continue;
    sum += normalizeMetric(metrics[name], range.good, range.bad) * range.weight;
    wsum += range.weight;
  }
  return wsum > 0 ? Math.round(sum / wsum) : 0;
}

/** Overall 0–100 score from the tests actually completed. */
export function computeOverallScore(results: TestResult[]): number {
  let sum = 0;
  let wsum = 0;
  for (const r of results) {
    const w = TEST_WEIGHTS[r.test] ?? 0.1;
    sum += r.subScore * w;
    wsum += w;
  }
  return wsum > 0 ? Math.round(sum / wsum) : 0;
}

export function riskLevel(score: number): RiskLevel {
  if (score <= RISK_CUTS.lowMax) return 'low';
  if (score <= RISK_CUTS.mediumMax) return 'medium';
  return 'high';
}

/** Per-test status for UI rows: normal / watch / check. */
export function testStatus(subScore: number): RiskLevel {
  return riskLevel(subScore);
}
