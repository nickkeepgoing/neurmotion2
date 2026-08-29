/**
 * Demo entry for the QR code shown to judges.
 *
 * WHY THIS EXISTS
 * A judge who scans the QR during a four-minute pitch has seconds, not minutes.
 * The normal path is Splash → Login (scroll-pick a birth date) → Consent (tick
 * two boxes) → Home, which is 45–60 seconds of form-filling before anything is
 * visible. They would still be choosing a birth year while the pitch ends.
 *
 * `?demo` skips straight to Home with a sample profile and seeded history so
 * the charts are not empty.
 *
 * PDPA: this does not weaken consent. Consent covers processing a real person's
 * data; demo mode enters a fixed fake profile, collects nothing about the
 * visitor, and keeps everything in their own browser. The normal link is
 * untouched and still requires full consent. A persistent banner marks the
 * session so nobody mistakes the sample data for their own result.
 */
import { seedSampleData } from './storage';
import type { Settings } from './types';

const FLAG = 'nm.demoMode';

/** True when the current URL asks for demo mode. */
export function demoRequested(): boolean {
  try {
    const q = new URLSearchParams(window.location.search);
    return q.has('demo') || q.get('mode') === 'demo';
  } catch {
    return false;
  }
}

/** True when this browser session is running as a demo. */
export function isDemo(): boolean {
  try {
    return sessionStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

export function clearDemo(): void {
  try {
    sessionStorage.removeItem(FLAG);
  } catch {
    /* private mode */
  }
}

/** The stand-in profile a judge lands in. Deliberately not a real person. */
const DEMO_PROFILE: Partial<Settings> = {
  consented: true,
  consentTraining: false,
  userType: 'general',
  displayName: '', // no name: the greeting reads "สวัสดีค่ะ" on its own
  age: 68,
  birthDate: '1958-05-14',
  voiceOn: false, // a phone that starts talking in a quiet hall is startling
};

/**
 * Enter demo mode: mark the session, write the sample profile, and seed a week
 * of history so the trend chart and calendar have something to show.
 * Returns false if storage is unavailable (private browsing).
 */
export function enterDemo(): boolean {
  try {
    sessionStorage.setItem(FLAG, '1');
    const raw = localStorage.getItem('nm.settings');
    const current = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    // keep whatever text size the visitor already chose
    localStorage.setItem(
      'nm.settings',
      JSON.stringify({ textScale: 0, ...current, ...DEMO_PROFILE })
    );
    seedSampleData();
    return true;
  } catch {
    return false;
  }
}
