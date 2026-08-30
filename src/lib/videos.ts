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

/** Max upload size target for Supabase Storage (5 MB) */
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

/**
 * Compress a video file client-side using canvas + MediaRecorder if file exceeds size limit.
 * Scales down resolution (max dim 720px) and lowers bitrate (~1.2 Mbps).
 */
export async function compressVideoIfNeeded(file: File): Promise<Blob> {
  if (file.size <= MAX_UPLOAD_SIZE) {
    return file;
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
    };

    // Timeout safety net (12 seconds)
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(file);
    }, 12000);

    video.onloadedmetadata = () => {
      try {
        const origWidth = video.videoWidth || 1280;
        const origHeight = video.videoHeight || 720;

        let targetWidth = origWidth;
        let targetHeight = origHeight;
        const maxDim = 720;
        if (Math.max(targetWidth, targetHeight) > maxDim) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
            targetWidth = maxDim;
          } else {
            targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
            targetHeight = maxDim;
          }
        }
        targetWidth = targetWidth - (targetWidth % 2);
        targetHeight = targetHeight - (targetHeight % 2);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
          clearTimeout(timeoutId);
          cleanup();
          resolve(file);
          return;
        }

        const stream = canvas.captureStream(25);
        const mimeType = [
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
        ].find((t) => MediaRecorder.isTypeSupported(t)) || '';

        const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: 1_200_000 };
        if (mimeType) recorderOptions.mimeType = mimeType;

        const mediaRecorder = new MediaRecorder(stream, recorderOptions);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          clearTimeout(timeoutId);
          cleanup();
          if (chunks.length > 0) {
            const compressedBlob = new Blob(chunks, { type: mimeType || 'video/mp4' });
            resolve(compressedBlob);
          } else {
            resolve(file);
          }
        };

        let animId: number;
        const drawFrame = () => {
          if (video.ended || video.paused) return;
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          animId = requestAnimationFrame(drawFrame);
        };

        video.onplay = () => {
          mediaRecorder.start();
          drawFrame();
        };

        video.onended = () => {
          cancelAnimationFrame(animId);
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };

        video.play().catch(() => {
          clearTimeout(timeoutId);
          cleanup();
          resolve(file);
        });
      } catch {
        clearTimeout(timeoutId);
        cleanup();
        resolve(file);
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(file);
    };
  });
}

/**
 * Upload a clip to Supabase Storage under the test's id.
 * Auto-compresses large files and provides clear status/error feedback.
 */
export async function uploadVideoToCloud(
  test: TestId,
  file: File,
  onStatusChange?: (status: string) => void
): Promise<CloudUploadResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' };
  }

  let uploadBody: Blob = file;
  if (file.size > MAX_UPLOAD_SIZE) {
    onStatusChange?.('compressing');
    try {
      uploadBody = await compressVideoIfNeeded(file);
    } catch {
      uploadBody = file;
    }
  }

  onStatusChange?.('uploading');
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${test}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': uploadBody.type || file.type || 'video/mp4', 'x-upsert': 'true' },
      body: uploadBody,
    });
    if (res.ok) return { ok: true };

    const body = await res.text().catch(() => '');
    if (res.status === 413 || (res.status === 400 && (body.includes('EntityTooLarge') || body.includes('Payload too large')))) {
      return {
        ok: false,
        reason: 'ไฟล์วิดีโอมีขนาดใหญ่เกินไป (ระบบรองรับไม่เกิน 5MB) กรุณาลดความยาวหรือขนาดวิดีโอก่อนอัปโหลด',
      };
    }
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
