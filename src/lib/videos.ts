/**
 * Tutorial-video source for each test, in priority order:
 *
 *   0. YouTube (admin pastes an Unlisted video's link in /admin) — the video
 *      itself lives on YouTube, not our infra, so there is no 50MB upload
 *      limit and no client-side re-encode: viewers get YouTube's own
 *      adaptive-bitrate stream at up to source quality. What we store is a
 *      tiny text object (`{test}.yt`, just the 11-char video ID) in the same
 *      Supabase `tutorials` bucket as tier 1 — no new infra, same policies.
 *   1. Supabase Storage (public bucket `tutorials`) — the actual video file,
 *      uploaded once from /admin, visible on every device. The fallback for
 *      anyone who'd rather upload a file than use YouTube.
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
 *  the async cloud check resolves. See getVideoUrl for the real 4-tier lookup. */
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

export type VideoSource =
  | { type: 'youtube'; id: string; embedUrl: string }
  | { type: 'file'; url: string };

/**
 * Resolve a clip's source: YouTube link first, then the cloud file, then
 * this device's local copy, then null (caller shows the animated demo
 * instead).
 *
 * Each cloud check has a short timeout so a slow or unreachable network
 * cannot stall the tutorial step — it just falls through to the next tier at
 * the same speed a missing video always resolved at.
 */
export async function getVideoUrl(test: TestId): Promise<VideoSource | null> {
  const ytId = await cloudYouTubeIdIfExists(test);
  if (ytId) return { type: 'youtube', id: ytId, embedUrl: youTubeEmbedUrl(ytId) };

  const cloudUrl = await cloudVideoUrlIfExists(test);
  if (cloudUrl) return { type: 'file', url: cloudUrl };

  if (hasVideo(test)) {
    try {
      const blob = await tx<Blob | undefined>('readonly', (s) => s.get(test) as IDBRequest<Blob | undefined>);
      if (blob) return { type: 'file', url: URL.createObjectURL(blob) };
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

// ------------------------------------------------------------- YouTube tier

const YT_ID_RE = /^[\w-]{11}$/;

/** Object key for the tiny text file holding a test's YouTube video ID. */
function ytObjectPath(test: TestId): string {
  return `${test}.yt`;
}

export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`;
}

/** Accepts a bare 11-char video ID or a youtu.be/youtube.com URL (watch, embed, or shorts). */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YT_ID_RE.test(trimmed)) return trimmed;

  try {
    // Admins commonly paste a link without a scheme (copied from an address
    // bar, not a share button) — treat a bare host the same as an https:// one.
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.hostname.endsWith('youtu.be')) {
      const id = url.pathname.slice(1);
      return YT_ID_RE.test(id) ? id : null;
    }
    if (url.hostname.endsWith('youtube.com')) {
      const embedMatch = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/);
      if (embedMatch) return embedMatch[1];
      const v = url.searchParams.get('v');
      if (v && YT_ID_RE.test(v)) return v;
    }
  } catch {
    /* not a URL — not a valid link either */
  }
  return null;
}

async function cloudYouTubeIdIfExists(test: TestId): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const url = publicVideoUrl(ytObjectPath(test));
  if (!url) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLOUD_CHECK_TIMEOUT_MS);
  try {
    // GET, not HEAD — the payload IS the video ID, and it's a few bytes.
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return YT_ID_RE.test(text) ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Save (or replace) the YouTube link for a test. Accepts an ID or a full URL. */
export async function saveYouTubeLink(test: TestId, idOrUrl: string): Promise<CloudUploadResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' };
  }
  const id = extractYouTubeId(idOrUrl);
  if (!id) return { ok: false, reason: 'ลิงก์ YouTube ไม่ถูกต้อง' };

  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${ytObjectPath(test)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'text/plain', 'x-upsert': 'true' },
      body: id,
    });
    if (res.ok) return { ok: true };
    return { ok: false, reason: `${res.status} ${await res.text()}`.trim() };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'บันทึกลิงก์ไม่สำเร็จ (เครือข่าย)' };
  }
}

export async function deleteYouTubeLink(test: TestId): Promise<CloudUploadResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'ยังไม่ได้ตั้งค่า Supabase' };
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${ytObjectPath(test)}`;
  try {
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
    return res.ok ? { ok: true } : { ok: false, reason: String(res.status) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'ลบไม่สำเร็จ (เครือข่าย)' };
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
 * Retains full video duration and original audio voiceover; bitrate and
 * resolution (up to 720p) are chosen from the size budget and duration so
 * the output reliably lands under MAX_UPLOAD_SIZE rather than a fixed rate
 * that only works for short clips.
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

        // Size-budget the encode so the output actually lands under
        // MAX_UPLOAD_SIZE regardless of source duration, instead of always
        // encoding at a fixed rate that either wastes quality on short clips
        // (tutorial clips are meant to be 5-15s, see the upload-failure copy
        // below) or overflows the limit on long ones. Ceiling is generous —
        // 8 Mbps — because a 15s clip at 8 Mbps is only ~15MB, well inside
        // the 50MB budget, so short clips upload at near-source quality.
        const AUDIO_BITRATE = 128_000; // explicit, not left to the browser default
        // 0.8, not 0.9: real tutorial clips run ~1-2 min with a lot of motion
        // (finger tapping, spiral demos), and a VBR encoder overshoots its
        // target bitrate in bursts on high-motion content — this margin is
        // what keeps those bursts from tipping a ~45MB target over 50MB.
        const CONTAINER_OVERHEAD = 0.8;
        const bitBudget = MAX_UPLOAD_SIZE * 8 * CONTAINER_OVERHEAD;
        const idealVideoBitrate = Math.floor(bitBudget / duration) - AUDIO_BITRATE;
        const targetBitrate = Math.max(250_000, Math.min(8_000_000, idealVideoBitrate));

        let targetWidth = origWidth;
        let targetHeight = origHeight;
        // Drop resolution further when the size budget forces a low bitrate,
        // otherwise a long clip would be encoded with too few bits per pixel
        // to be watchable; raise it to 1080p when the budget comfortably
        // supports it (short high-bitrate clips) for a crisper picture.
        const maxDim =
          targetBitrate < 600_000 ? 640 : targetBitrate < 1_200_000 ? 854 : targetBitrate < 4_000_000 ? 1280 : 1920;
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

        const canvasStream = canvas.captureStream(30);
        
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

        // VP9 first: same bitrate encodes noticeably sharper than VP8, and
        // it's what Chrome/Edge/Firefox all support via captureStream.
        const mimeType = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ].find((t) => MediaRecorder.isTypeSupported(t)) || '';

        const recorderOptions: MediaRecorderOptions = {
          videoBitsPerSecond: targetBitrate,
          audioBitsPerSecond: AUDIO_BITRATE,
        };
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

export type CloudVideoStatus = { kind: 'youtube'; id: string } | { kind: 'file' } | { kind: 'none' };

/** Check every test's cloud clip (YouTube link first, then file) in parallel, for the admin list view. */
export async function cloudVideoStatus(): Promise<Record<TestId, CloudVideoStatus>> {
  const tests: TestId[] = ['spiral', 'tapping', 'tremor', 'facial', 'voice'];
  const entries = await Promise.all(
    tests.map(async (t) => {
      const ytId = await cloudYouTubeIdIfExists(t);
      if (ytId) return [t, { kind: 'youtube', id: ytId } as CloudVideoStatus] as const;
      const fileUrl = await cloudVideoUrlIfExists(t);
      return [t, { kind: fileUrl ? 'file' : 'none' } as CloudVideoStatus] as const;
    })
  );
  return Object.fromEntries(entries) as Record<TestId, CloudVideoStatus>;
}
