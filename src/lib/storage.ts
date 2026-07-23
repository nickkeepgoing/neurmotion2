/**
 * Storage abstraction over localStorage. Swap the internals for a real
 * backend (Supabase/Firebase) later without touching callers.
 *
 * PDPA note: only computed metric numbers are stored — never raw
 * video/audio/sensor streams.
 */
import { computeOverallScore, overallRiskLevel, shouldSeeDoctor } from './scoring';
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
