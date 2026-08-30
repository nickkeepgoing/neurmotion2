/**
 * Storage abstraction over localStorage. Swap the internals for a real
 * backend (Supabase/Firebase) later without touching callers.
 *
 * PDPA note: only computed metric numbers are stored — never raw
 * video/audio/sensor streams.
 */
import { computeOverallScore, overallRiskLevel, riskLevel, shouldSeeDoctor } from './scoring';
import type { RiskLevel, Session, Settings, TestId, TestResult } from './types';

const KEY_SETTINGS = 'nm.settings';
const KEY_SESSIONS = 'nm.sessions';

const DEFAULT_SETTINGS: Settings = {
  consented: false,
  consentTraining: false,
  userType: 'general',
  displayName: '',
  textScale: 0,
  voiceOn: true, // spoken Thai guidance on by default (elderly-first)
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function loadSettings(): Settings {
  return read(KEY_SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
}

function loadSessionsRaw(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_SESSIONS) ?? '[]') as Session[];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]): void {
  localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
}

/** All sessions, oldest first. */
export function loadSessions(): Session[] {
  return loadSessionsRaw().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * LOCAL calendar day for a stored timestamp.
 *
 * Slicing the ISO string gave the UTC day, so in Thailand (UTC+7) anything
 * before 07:00 local was filed under the previous day — silently merging two
 * days or breaking a genuine streak. 'en-CA' formats as YYYY-MM-DD.
 */
function dateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA');
}

/** Today's session, if any. */
export function todaySession(): Session | undefined {
  const today = dateKey(new Date().toISOString());
  return loadSessions().find((s) => dateKey(s.timestamp) === today);
}

/**
 * Save one completed test result into today's session (creating the session
 * if needed), recomputing the session's overall score + risk level.
 */
export function saveTestResult(result: TestResult, userType: Session['userType']): Session {
  const sessions = loadSessionsRaw();
  const today = dateKey(new Date().toISOString());
  let session = sessions.find((s) => dateKey(s.timestamp) === today);
  if (!session) {
    session = {
      id: `s-${Date.now()}`,
      userType,
      results: [],
      overallScore: 0,
      riskLevel: 'low',
      timestamp: new Date().toISOString(),
    };
    sessions.push(session);
  }
  // one result per test per day — retest replaces
  session.results = session.results.filter((r) => r.test !== result.test);
  session.results.push(result);
  session.overallScore = computeOverallScore(session.results);
  // red-flag override: one severely abnormal domain can't be averaged to "low"
  session.riskLevel = overallRiskLevel(session.overallScore, session.results);
  session.timestamp = new Date().toISOString();
  saveSessions(sessions);
  return session;
}

/** Which tests are completed in today's session. */
export function completedToday(): Set<TestId> {
  const s = todaySession();
  return new Set((s?.results ?? []).map((r) => r.test));
}

const KEY_ROUND = 'nm.roundStart';

/**
 * "ทำการทดสอบอีกครั้ง": mark the start of a fresh retest round so the
 * next-test chaining walks through all 5 again, ignoring results saved
 * earlier today.
 */
export function startRetestRound(): void {
  sessionStorage.setItem(KEY_ROUND, new Date().toISOString());
}

export function clearRetestRound(): void {
  sessionStorage.removeItem(KEY_ROUND);
}

const TEST_ORDER: TestId[] = ['spiral', 'tapping', 'tremor', 'facial', 'voice'];

/**
 * Next test still outstanding in this round, skipping `except`.
 * Used so that skipping a test continues the run instead of dropping the user
 * back to the dashboard and breaking the chain.
 */
export function nextIncompleteTest(except?: TestId): TestId | undefined {
  const done = completedThisRound();
  return TEST_ORDER.find((t) => !done.has(t) && t !== except);
}

/** Tests completed in the current round (falls back to today's results). */
export function completedThisRound(): Set<TestId> {
  const results = todaySession()?.results ?? [];
  const roundStart = sessionStorage.getItem(KEY_ROUND);
  const inRound = roundStart ? results.filter((r) => r.timestamp >= roundStart) : results;
  return new Set(inRound.map((r) => r.test));
}

/** Latest session (today or most recent past day). */
export function latestSession(): Session | undefined {
  const all = loadSessions();
  return all[all.length - 1];
}

/** Latest session per calendar day, oldest day first. */
export function dailyLatestSessions(): Session[] {
  const byDay = new Map<string, Session>();
  for (const s of loadSessionsRaw()) {
    const day = dateKey(s.timestamp);
    const prev = byDay.get(day);
    if (!prev || s.timestamp > prev.timestamp) byDay.set(day, s);
  }
  return [...byDay.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Trend series for the graph: one point per day using that day's LATEST
 * session score (never the first), most recent `maxDays` days.
 */
export function trendSeries(maxDays = 7): { day: string; score: number; level: RiskLevel }[] {
  return dailyLatestSessions()
    .slice(-maxDays)
    .map((s) => ({ day: s.timestamp, score: s.overallScore, level: s.riskLevel }));
}

/** True once the user has been high-risk for enough consecutive days. */
export function doctorAlert(): boolean {
  return shouldSeeDoctor(loadSessions());
}

/**
 * Seed a week of plausible sessions so the trend chart and history are never
 * empty when someone opens the app for the first time (e.g. a judge on stage).
 * Demo aid only — reachable from the admin screen, never from the patient flow.
 */
export function seedSampleData(): void {
  const mk = (daysAgo: number, score: number): Session => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(9, 30, 0, 0);
    const ts = d.toISOString();
    // metric values chosen to land near the session's overall score
    const k = score / 100;
    return {
      id: `demo-${daysAgo}`,
      userType: 'general',
      timestamp: ts,
      overallScore: score,
      riskLevel: riskLevel(score),
      results: [
        {
          test: 'spiral',
          metrics: {
            rmsErrorNorm: 0.05 + k * 0.22,
            tremorBandPower: 0.03 + k * 0.16,
            spacingCV: 0.08 + k * 0.25,
            speedCV: 0.35 + k * 0.6,
            coverage: 1,
          },
          subScore: score,
          timestamp: ts,
        },
        {
          test: 'tapping',
          metrics: {
            rate: 5 - k * 2.8,
            itiSD: 30 + k * 95,
            decrementSlope: k * 4.6,
            timingError: 50 + k * 120,
            asymmetry: 0.08 + k * 0.3,
            count: 60,
          },
          subScore: score,
          timestamp: ts,
        },
        {
          test: 'tremor',
          metrics: {
            restBandPower: 0.04 + k * 0.2,
            restRms: 0.02 + k * 0.25,
            posturalBandPower: 0.05 + k * 0.12,
            posturalRms: 0.03 + k * 0.14,
            samples: 900,
          },
          subScore: score,
          timestamp: ts,
        },
      ],
    };
  };
  // A gently improving week with one worse day, ending mid-range — and ending
  // YESTERDAY, so the demo user arrives with history but nothing done today.
  //
  // Seeding today too left three of the five tests already ticked off, which
  // pointed the dashboard's one big button at the head-turn test: the judge's
  // very first tap would open a camera-permission prompt and wait on the face
  // model to download. Leaving today empty aims that same button at the spiral
  // instead — no permission, no model, draws immediately — and tells a better
  // story besides: here is your week, now add today's reading to it.
  const scores = [52, 46, 58, 41, 35, 44, 38];
  saveSessions(scores.map((s, i) => mk(scores.length - i, s)));
}

/**
 * Erase everything this app stored about the user.
 *
 * PDPA: the consent screen promises "ถอนความยินยอมได้ทุกเมื่อ" — this is the
 * mechanism that makes that promise true. Doubles as a clean reset between
 * demo users.
 */
export function eraseAllData(): void {
  localStorage.removeItem(KEY_SETTINGS);
  localStorage.removeItem(KEY_SESSIONS);
  sessionStorage.removeItem(KEY_ROUND);
}

/**
 * Sign out: drop everything that identifies a person, keep their saved results.
 *
 * Consent is cleared deliberately. Consent under PDPA is given by a person, not
 * by a device, so whoever signs in next has to give their own — they land on
 * the consent screen, not straight into someone else's session.
 *
 * Text size and voice guidance survive on purpose. They are accessibility
 * settings rather than personal data, and making an elderly user re-find the
 * large-text option just to sign back in would be its own accessibility bug.
 *
 * NOTE: saved results are NOT per-person — there are no real accounts in this
 * demo, so results stay on the device and whoever signs in next would see them.
 * The confirm copy says so, and `eraseAllData` is the button that clears them.
 * Namespacing sessions per profile is the real fix when a backend arrives.
 */
export function logout(): void {
  const s = loadSettings();
  saveSettings({
    ...DEFAULT_SETTINGS,
    textScale: s.textScale,
    voiceOn: s.voiceOn,
  });
  sessionStorage.removeItem(KEY_ROUND);
}
