/**
 * Scoring: raw metrics → 0–100 sub-scores → overall score → risk level.
 * All ranges/weights live in thresholds.ts. Higher score = more concerning.
 */
import {
  AGE_MAX_DECADES,
  AGE_REF,
  AGE_SHIFT,
  METRIC_RANGES,
  RED_FLAG_SUBSCORE,
  RISK_CUTS,
  RISK_STREAK_DAYS,
  TEST_WEIGHTS,
  type MetricRange,
} from './thresholds';
import type { RiskLevel, Session, TestId, TestResult } from './types';

/** Linear map from `good` (0) to `bad` (100), clamped. Handles inverted ranges. */
export function normalizeMetric(value: number, good: number, bad: number): number {
  const raw = ((value - good) / (bad - good)) * 100;
  return Math.min(100, Math.max(0, raw));
}

/**
 * The metric's good/bad anchors for a person of this age.
 *
 * Normal ageing slows fine motor speed, widens timing variability and reduces
 * range of motion; without this the same cut point over-flags an 80-year-old
 * and under-flags a 55-year-old. Passing no age leaves the range untouched.
 */
export function ageAdjustedRange(test: TestId, name: string, range: MetricRange, age?: number): MetricRange {
  if (!age || age <= AGE_REF) return range;
  const shift = AGE_SHIFT[test]?.[name];
  if (!shift) return range;
  const decades = Math.min((age - AGE_REF) / 10, AGE_MAX_DECADES);
  const span = range.bad - range.good;
  return { ...range, good: range.good + span * shift * decades };
}

/** Weighted sub-score for one test from its raw metrics. */
export function computeSubScore(test: TestId, metrics: Record<string, number>, age?: number): number {
  const ranges = METRIC_RANGES[test];
  let sum = 0;
  let wsum = 0;
  for (const [name, base] of Object.entries(ranges)) {
    if (!(name in metrics)) continue;
    const range = ageAdjustedRange(test, name, base, age);
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

/** Tests whose own sub-score is a red flag, worst first. */
export function redFlagTests(results: TestResult[]): TestId[] {
  return results
    .filter((r) => r.subScore >= RED_FLAG_SUBSCORE)
    .sort((a, b) => b.subScore - a.subScore)
    .map((r) => r.test);
}

/**
 * Overall risk level, with the red-flag override applied: a single severely
 * abnormal domain can never be averaged down to "low". See RED_FLAG_SUBSCORE.
 */
export function overallRiskLevel(score: number, results: TestResult[]): RiskLevel {
  const base = riskLevel(score);
  if (base === 'low' && redFlagTests(results).length > 0) return 'medium';
  return base;
}

/** Per-test status for UI rows: normal / watch / check. */
export function testStatus(subScore: number): RiskLevel {
  return riskLevel(subScore);
}

/** Per-metric normalized 0–100 scores for one test, sorted most concerning first. */
export function metricScores(test: TestId, metrics: Record<string, number>, age?: number): { name: string; score: number }[] {
  const ranges = METRIC_RANGES[test] ?? {};
  return Object.entries(ranges)
    .filter(([name]) => name in metrics)
    .map(([name, base]) => {
      const range = ageAdjustedRange(test, name, base, age);
      return { name, score: Math.round(normalizeMetric(metrics[name], range.good, range.bad)) };
    })
    .sort((a, b) => b.score - a.score);
}

/** Local calendar day (YYYY-MM-DD) for a stored timestamp. */
function localDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA');
}

/** Shift a YYYY-MM-DD key by `n` days. */
function shiftDay(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d + n).toLocaleDateString('en-CA');
}

/**
 * Consecutive CALENDAR days, counting back from today, whose session is
 * high-risk. `sessions` may be in any order.
 *
 * Two bugs this fixes: it used to walk the list of days that HAVE sessions,
 * so results months apart still counted as "consecutive"; and it was not
 * anchored to today, so a streak that ended long ago kept firing the alert.
 * A missed day now ends the streak, which is what "ต่อเนื่อง N วัน" claims.
 */
export function highRiskStreak(sessions: Session[]): number {
  // latest session per local day
  const byDay = new Map<string, Session>();
  for (const s of sessions) {
    const day = localDay(s.timestamp);
    const prev = byDay.get(day);
    if (!prev || s.timestamp > prev.timestamp) byDay.set(day, s);
  }

  const today = new Date().toLocaleDateString('en-CA');
  // allow the streak to end yesterday — the user may not have tested yet today
  let cursor = byDay.has(today) ? today : shiftDay(today, -1);

  let streak = 0;
  while (byDay.get(cursor)?.riskLevel === 'high') {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** Whether the high-risk streak has reached the doctor-alert threshold. */
export function shouldSeeDoctor(sessions: Session[]): boolean {
  return highRiskStreak(sessions) >= RISK_STREAK_DAYS;
}
