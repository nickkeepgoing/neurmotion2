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
export type UploadProgressInfo = {
  stage: 'compressing' | 'uploading';
  percent: number;
};

/** Max upload size target for Supabase Storage (50 MB) */
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

/**
 * Compress a video file client-side if file exceeds 50 MB.
 * Retains FULL video duration, HD 720p resolution, and original audio voiceover.
 */
export async function compressVideoIfNeeded(
  file: File,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  if (file.size <= MAX_UPLOAD_SIZE) {
    return file;
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.preload = 'metadata';
    video.muted = false; // allow audio capture
    video.playsInline = true;
    video.setAttribute('playsinline', '');

    document.body.appendChild(video);
    video.src = URL.createObjectURL(file);

    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        URL.revokeObjectURL(video.src);
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      } catch {
        /* ignore */
      }
    };

    // Default safety timeout until metadata loads
    timeoutId = setTimeout(() => {
      cleanup();
      resolve(file);
    }, 45000);

    video.onloadedmetadata = () => {
      try {
        const origWidth = video.videoWidth || 1280;
        const origHeight = video.videoHeight || 720;
        const duration = video.duration || 10;

        // Reset timeout dynamically based on full duration
        clearTimeout(timeoutId);
        const dynamicTimeoutMs = Math.max(90000, Math.ceil(duration * 1000 * 2));
        timeoutId = setTimeout(() => {
          cleanup();
          resolve(file);
        }, dynamicTimeoutMs);

        // HD quality 720p (max dimension 1280px) at ~2.0 Mbps for crystal clear video
        const targetBitrate = 2_000_000;

        let targetWidth = origWidth;
        let targetHeight = origHeight;
        const maxDim = 1280;
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
          cleanup();
          resolve(file);
          return;
        }

        const canvasStream = canvas.captureStream(25);
        
        // Extract audio track from video element if available
        let audioTrack: MediaStreamTrack | null = null;
        try {
          const videoStream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null;
          audioTrack = videoStream?.getAudioTracks()?.[0] || null;
        } catch {
          audioTrack = null;
        }

        const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
        if (audioTrack) {
          tracks.push(audioTrack);
        }

        const combinedStream = new MediaStream(tracks);

        const mimeType = [
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ].find((t) => MediaRecorder.isTypeSupported(t)) || '';

        const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: targetBitrate };
        if (mimeType) recorderOptions.mimeType = mimeType;

        const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          cleanup();
          onProgress?.(100);
          if (chunks.length > 0) {
            const compressedBlob = new Blob(chunks, { type: mimeType || 'video/mp4' });
            resolve(compressedBlob);
          } else {
            resolve(file);
          }
        };

        let animId: number;
        const drawFrame = () => {
          if (video.ended || video.paused) {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
            return;
          }
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          if (onProgress && duration > 0) {
            const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
            onProgress(pct);
          }
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
          cleanup();
          resolve(file);
        });
      } catch {
        cleanup();
        resolve(file);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(file);
    };
  });
}

/**
 * Upload a clip to Supabase Storage under the test's id using XHR for real-time progress.
 */
export async function uploadVideoToCloud(
  test: TestId,
  file: File,
  onProgress?: (info: UploadProgressInfo) => void
): Promise<CloudUploadResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' };
  }

  let uploadBody: Blob = file;
  if (file.size > MAX_UPLOAD_SIZE) {
    onProgress?.({ stage: 'compressing', percent: 0 });
    try {
      uploadBody = await compressVideoIfNeeded(file, (pct) => {
        onProgress?.({ stage: 'compressing', percent: pct });
      });
    } catch {
      uploadBody = file;
    }
  }

  const doUpload = (body: Blob) => {
    onProgress?.({ stage: 'uploading', percent: 0 });
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${test}`;
    const headers = { ...authHeaders(), 'Content-Type': body.type || file.type || 'video/mp4', 'x-upsert': 'true' };

    return new Promise<{ ok: boolean; status: number; bodyText: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
            onProgress({ stage: 'uploading', percent: pct });
          }
        };
      }
      xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, bodyText: xhr.responseText || '' });
      xhr.onerror = () => reject(new Error('อัปโหลดไม่สำเร็จ (เครือข่าย)'));
      xhr.ontimeout = () => reject(new Error('การอัปโหลดหมดเวลา'));
      xhr.send(body);
    });
  };

  try {
    let res = await doUpload(uploadBody);

    // If initial upload failed with 413/400 payload error and we haven't compressed yet, compress now and retry
    if (!res.ok && (res.status === 413 || (res.status === 400 && (res.bodyText.includes('EntityTooLarge') || res.bodyText.includes('Payload too large'))))) {
      if (uploadBody === file) {
        onProgress?.({ stage: 'compressing', percent: 0 });
        try {
          uploadBody = await compressVideoIfNeeded(file, (pct) => {
            onProgress?.({ stage: 'compressing', percent: pct });
          });
          res = await doUpload(uploadBody);
        } catch {
          /* ignore */
        }
      }
    }

    if (res.ok) return { ok: true };

    if (res.status === 413 || (res.status === 400 && (res.bodyText.includes('EntityTooLarge') || res.bodyText.includes('Payload too large')))) {
      return {
        ok: false,
        reason: 'ไฟล์วิดีโอมีขนาดใหญ่เกินขีดจำกัดของระบบกลาง กรุณาใช้คลิปวิดีโอสั้นๆ (ความยาวประมาณ 5-15 วินาที)',
      };
    }
    return { ok: false, reason: `${res.status} ${res.bodyText}`.trim() };
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
