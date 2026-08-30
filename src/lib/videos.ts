/**
 * Tutorial-video source for each test, in priority order:
 *
 *   1. Supabase Storage (public bucket `tutorials`) — uploaded once from
 *      /admin, visible on every device. This is the real answer to "I upload
 *      once, judges see it on their own phones."
 *   2. IndexedDB on THIS device — the original per-device store. Kept as the
 *      offline fallback: if the venue's internet drops mid-pitch, a clip
 *      saved locally beforehand still plays.
 *   3. Neither — TestIntro already falls back to the animated demo, so a
 *      missing video was always a handled case, not an error state.
 *
 * Each layer degrades to the next rather than throwing, because the one
 * failure mode this file must never produce is a blank tutorial step during
 * a live demo.
 */
import { authHeaders, isSupabaseConfigured, publicVideoUrl, SUPABASE_URL, BUCKET } from './supabase';
import type { TestId } from './types';

const DB_NAME = 'nm-videos';
const STORE = 'clips';
const KEY_LIST = 'nm.videoKeys';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

/** Tests that have a LOCAL clip on this device (synchronous, from localStorage). */
export function videoKeys(): TestId[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_LIST) ?? '[]') as TestId[];
  } catch {
    return [];
  }
}

/** Synchronous, local-device check only — used for the step-1 caption before
 *  the async cloud check resolves. See getVideoUrl for the real 3-tier lookup. */
export function hasVideo(test: TestId): boolean {
  return videoKeys().includes(test);
}

function setLocalKey(test: TestId, present: boolean): void {
  const keys = new Set(videoKeys());
  if (present) keys.add(test);
  else keys.delete(test);
  localStorage.setItem(KEY_LIST, JSON.stringify([...keys]));
}

/** Save a clip to THIS device only (unchanged from the original design). */
export async function saveVideo(test: TestId, blob: Blob): Promise<void> {
  await tx('readwrite', (s) => s.put(blob, test));
  setLocalKey(test, true);
}

export async function deleteVideo(test: TestId): Promise<void> {
  await tx('readwrite', (s) => s.delete(test));
  setLocalKey(test, false);
}

/**
 * Resolve a clip's URL: cloud first, then this device's local copy, then
 * null (caller shows the animated demo instead).
 *
 * The cloud check is a HEAD request with a short timeout so a slow or
 * unreachable network cannot stall the tutorial step — it just falls through
 * to the next tier at the same speed a missing video always resolved at.
 */
export async function getVideoUrl(test: TestId): Promise<string | null> {
  const cloudUrl = await cloudVideoUrlIfExists(test);
  if (cloudUrl) return cloudUrl;

  if (hasVideo(test)) {
    try {
      const blob = await tx<Blob | undefined>('readonly', (s) => s.get(test) as IDBRequest<Blob | undefined>);
      if (blob) return URL.createObjectURL(blob);
    } catch {
      /* fall through to null */
    }
  }
  return null;
}

const CLOUD_CHECK_TIMEOUT_MS = 2500;

async function cloudVideoUrlIfExists(test: TestId): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const url = publicVideoUrl(test);
  if (!url) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLOUD_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    return res.ok ? url : null;
  } catch {
    return null; // offline, DNS failure, CORS, timeout — all treated the same
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------- admin: cloud

export type CloudUploadResult = { ok: true } | { ok: false; reason: string };

/**
 * Upload a clip to Supabase Storage under the test's id, with no extension —
 * Storage serves back whatever Content-Type the browser sent on upload, so a
 * plain `<video>` tag works without needing to guess a matching extension.
 *
 * `x-upsert: true` makes re-uploading the same test overwrite the old clip
 * instead of erroring, so "replace" in the admin UI is just "upload again".
 */
export async function uploadVideoToCloud(test: TestId, file: File): Promise<CloudUploadResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' };
  }
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${test}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': file.type || 'video/mp4', 'x-upsert': 'true' },
      body: file,
    });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => '');
    return { ok: false, reason: `${res.status} ${body}`.trim() };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ (เครือข่าย)' };
  }
}

export async function deleteVideoFromCloud(test: TestId): Promise<CloudUploadResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'ยังไม่ได้ตั้งค่า Supabase' };
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${test}`;
  try {
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
    return res.ok ? { ok: true } : { ok: false, reason: String(res.status) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'ลบไม่สำเร็จ (เครือข่าย)' };
  }
}

/** HEAD-check every test's cloud clip in parallel, for the admin list view. */
export async function cloudVideoStatus(): Promise<Record<TestId, boolean>> {
  const tests: TestId[] = ['spiral', 'tapping', 'tremor', 'facial', 'voice'];
  const entries = await Promise.all(
    tests.map(async (t) => [t, Boolean(await cloudVideoUrlIfExists(t))] as const)
  );
  return Object.fromEntries(entries) as Record<TestId, boolean>;
}
