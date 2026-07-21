/**
 * Tutorial-video store for each test. Admins upload a short "how to" clip per
 * test; it is shown in step 1 of the test flow. Clips are kept as Blobs in
 * IndexedDB so they survive reloads without bloating localStorage.
 *
 * A lightweight `nm.videoKeys` list in localStorage mirrors which tests have a
 * clip, so the UI can decide synchronously whether to show the video step.
 */
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

/** Tests that currently have a tutorial clip (synchronous, from localStorage). */
export function videoKeys(): TestId[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_LIST) ?? '[]') as TestId[];
  } catch {
    return [];
  }
}

export function hasVideo(test: TestId): boolean {
  return videoKeys().includes(test);
}

function setKey(test: TestId, present: boolean): void {
  const keys = new Set(videoKeys());
  if (present) keys.add(test);
  else keys.delete(test);
  localStorage.setItem(KEY_LIST, JSON.stringify([...keys]));
}

export async function saveVideo(test: TestId, blob: Blob): Promise<void> {
  await tx('readwrite', (s) => s.put(blob, test));
  setKey(test, true);
}

export async function deleteVideo(test: TestId): Promise<void> {
  await tx('readwrite', (s) => s.delete(test));
  setKey(test, false);
}

/** Returns an object URL for the clip (caller must revokeObjectURL), or null. */
export async function getVideoUrl(test: TestId): Promise<string | null> {
  if (!hasVideo(test)) return null;
  try {
    const blob = await tx<Blob | undefined>('readonly', (s) => s.get(test) as IDBRequest<Blob | undefined>);
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}
