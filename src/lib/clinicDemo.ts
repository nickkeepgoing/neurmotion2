/**
 * Simulated patient cohort for the clinician view.
 *
 * WHY THIS IS SEPARATE FROM REAL DATA
 * The clinician view needs many people; the app itself only ever holds one
 * person's results. Rather than pretend those are a population, this generates
 * an openly-labelled demo cohort under its own storage key, so a real user's
 * results can never be mistaken for — or mixed into — the population view.
 *
 * PDPA: every record here is synthetic. There is no name, no national ID and
 * no contact detail anywhere in this file, only an anonymous reference code,
 * because that is also the rule the real dashboard will have to follow.
 */
import { riskLevel } from './scoring';
import type { RiskLevel, TestId } from './types';

const KEY = 'nm.clinicDemo';

export type DemoPoint = { day: string; score: number };

export type DemoPatient = {
  /** anonymous reference code — never a name or national ID */
  code: string;
  age: number;
  /** most recent screening score, 0–100 */
  score: number;
  level: RiskLevel;
  /** ISO timestamp of the most recent screening */
  lastAt: string;
  /** consecutive days in the high-risk band */
  streak: number;
  /** score history, oldest first */
  history: DemoPoint[];
  /** latest sub-score per test; a missing test was not completed */
  subScores: Partial<Record<TestId, number>>;
  /** has a clinician taken this case */
  followedUp: boolean;
};

export type DemoCohort = {
  generatedAt: string;
  patients: DemoPatient[];
  /** screenings recorded today / in the last 7 days */
  today: number;
  week: number;
};

/** Deterministic PRNG so the same seed always produces the same cohort. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const TESTS: TestId[] = ['spiral', 'tapping', 'tremor', 'facial', 'voice'];

/**
 * Build a cohort whose shape resembles a real screening population: most
 * people are fine, a few need watching, a small number need follow-up.
 */
export function generateCohort(n = 42, seed = 20260901): DemoCohort {
  const r = rng(seed);
  const patients: DemoPatient[] = [];
  const now = Date.now();

  /*
   * Band composition is STRATIFIED, not rolled per patient.
   *
   * Drawing each band independently at ~7% high meant a 42-person cohort came
   * up with zero high-risk cases about one run in twenty — and the default seed
   * happened to be one of them, leaving the triage table empty. A demo dataset
   * whose whole point is triage must never depend on that draw.
   */
  const nHigh = Math.max(3, Math.round(n * 0.07));
  const nMedium = Math.max(4, Math.round(n * 0.21));
  const bands: ('low' | 'medium' | 'high')[] = [
    ...Array<'high'>(nHigh).fill('high'),
    ...Array<'medium'>(nMedium).fill('medium'),
    ...Array<'low'>(Math.max(0, n - nHigh - nMedium)).fill('low'),
  ];
  // shuffle so ages and codes are not correlated with severity
  for (let i = bands.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [bands[i], bands[j]] = [bands[j], bands[i]];
  }

  for (let i = 0; i < n; i++) {
    const band = bands[i];
    const target = band === 'low' ? 8 + r() * 22 : band === 'medium' ? 36 + r() * 26 : 70 + r() * 24;

    // a trajectory that drifts toward the target, so trends look plausible
    const days = 6 + Math.floor(r() * 6);
    const history: DemoPoint[] = [];
    // start somewhere near the target and wander
    let cur = Math.max(4, Math.min(96, target + (r() - 0.5) * 22));
    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(now - d * 86400000);
      cur += (target - cur) * 0.35 + (r() - 0.5) * 7;
      cur = Math.max(3, Math.min(97, cur));
      history.push({ day: date.toISOString().slice(0, 10), score: Math.round(cur) });
    }

    const score = history[history.length - 1].score;
    const level = riskLevel(score);

    // consecutive days at the end of the history sitting in the high band
    let streak = 0;
    for (let k = history.length - 1; k >= 0; k--) {
      if (riskLevel(history[k].score) === 'high') streak++;
      else break;
    }

    // most people finish all five; some drop the camera/mic ones
    const subScores: Partial<Record<TestId, number>> = {};
    for (const t of TESTS) {
      const skip = (t === 'facial' && r() < 0.3) || (t === 'voice' && r() < 0.38);
      if (skip) continue;
      const spread = (r() - 0.5) * 34;
      subScores[t] = Math.max(0, Math.min(100, Math.round(score + spread)));
    }

    const hoursAgo = Math.floor(r() * 54);
    patients.push({
      code: `NM-${String(1000 + Math.floor(r() * 8999)).padStart(4, '0')}`,
      age: 58 + Math.floor(r() * 30),
      score,
      level,
      lastAt: new Date(now - hoursAgo * 3600000).toISOString(),
      streak,
      history,
      subScores,
      // higher-risk cases are more likely to already be claimed
      followedUp: level === 'high' ? r() < 0.45 : r() < 0.12,
    });
  }

  // most-urgent first: high risk, then longest streak, then worst score
  const rank = { high: 0, medium: 1, low: 2 } as const;
  patients.sort(
    (a, b) => rank[a.level] - rank[b.level] || b.streak - a.streak || b.score - a.score,
  );

  const dayMs = 86400000;
  const today = patients.filter((p) => now - Date.parse(p.lastAt) < dayMs).length;
  const week = patients.filter((p) => now - Date.parse(p.lastAt) < 7 * dayMs).length;

  return { generatedAt: new Date().toISOString(), patients, today, week };
}

export function loadCohort(): DemoCohort | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoCohort) : null;
  } catch {
    return null;
  }
}

export function saveCohort(c: DemoCohort): void {
  localStorage.setItem(KEY, JSON.stringify(c));
}

export function clearCohort(): void {
  localStorage.removeItem(KEY);
}

/** Load the cohort, generating and storing one on first use. */
export function ensureCohort(): DemoCohort {
  const existing = loadCohort();
  if (existing?.patients?.length) return existing;
  const fresh = generateCohort();
  saveCohort(fresh);
  return fresh;
}

/** Mark a case as followed up (kept in the demo store only). */
export function setFollowedUp(code: string, value: boolean): DemoCohort | null {
  const c = loadCohort();
  if (!c) return null;
  const p = c.patients.find((x) => x.code === code);
  if (!p) return c;
  p.followedUp = value;
  saveCohort(c);
  return c;
}

// ------------------------------------------------------------------ summaries

export type CohortStats = {
  total: number;
  today: number;
  week: number;
  highCount: number;
  /** high-risk cases not yet claimed by anyone */
  unclaimed: number;
  meanScore: number;
  byLevel: Record<RiskLevel, number>;
  /** completion rate per test, 0–1 */
  participation: { test: TestId; rate: number }[];
  /** mean score per day across the cohort, oldest first */
  trend: { day: string; score: number; count: number }[];
};

export function cohortStats(c: DemoCohort): CohortStats {
  const total = c.patients.length || 1;
  const byLevel: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  for (const p of c.patients) byLevel[p.level]++;

  const participation = TESTS.map((test) => ({
    test,
    rate: c.patients.filter((p) => p.subScores[test] !== undefined).length / total,
  }));

  // average every patient's score per calendar day
  const bucket = new Map<string, { sum: number; n: number }>();
  for (const p of c.patients) {
    for (const h of p.history) {
      const b = bucket.get(h.day) ?? { sum: 0, n: 0 };
      b.sum += h.score;
      b.n++;
      bucket.set(h.day, b);
    }
  }
  const trend = [...bucket.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([day, b]) => ({ day, score: Math.round(b.sum / b.n), count: b.n }));

  return {
    total: c.patients.length,
    today: c.today,
    week: c.week,
    highCount: byLevel.high,
    unclaimed: c.patients.filter((p) => p.level === 'high' && !p.followedUp).length,
    meanScore: Math.round(c.patients.reduce((s, p) => s + p.score, 0) / total),
    byLevel,
    participation,
    trend,
  };
}

/** "วันนี้ 09:12" / "เมื่อวาน 17:03" / "3 วันก่อน" */
export function relativeThaiTime(iso: string): string {
  const d = new Date(iso);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startOfToday.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays <= 0) return `วันนี้ ${hhmm}`;
  if (diffDays === 1) return `เมื่อวาน ${hhmm}`;
  return `${diffDays} วันก่อน`;
}

/** Direction of the last two points: worse / better / flat. */
export function trendOf(p: DemoPatient): 'worse' | 'better' | 'flat' {
  if (p.history.length < 2) return 'flat';
  const d = p.history[p.history.length - 1].score - p.history[p.history.length - 2].score;
  if (d >= 4) return 'worse';
  if (d <= -4) return 'better';
  return 'flat';
}
