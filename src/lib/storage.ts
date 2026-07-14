/**
 * Storage abstraction over localStorage. Swap the internals for a real
 * backend (Supabase/Firebase) later without touching callers.
 *
 * PDPA note: only computed metric numbers are stored — never raw
 * video/audio/sensor streams.
 */
import { computeOverallScore, riskLevel } from './scoring';
import type { Session, Settings, TestId, TestResult } from './types';

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

function dateKey(iso: string): string {
  return iso.slice(0, 10);
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
  session.riskLevel = riskLevel(session.overallScore);
  session.timestamp = new Date().toISOString();
  saveSessions(sessions);
  return session;
}

/** Which tests are completed in today's session. */
export function completedToday(): Set<TestId> {
  const s = todaySession();
  return new Set((s?.results ?? []).map((r) => r.test));
}

/** Latest session (today or most recent past day). */
export function latestSession(): Session | undefined {
  const all = loadSessions();
  return all[all.length - 1];
}
