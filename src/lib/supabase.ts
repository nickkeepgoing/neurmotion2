/**
 * Supabase Storage config for tutorial videos.
 *
 * Deliberately no `@supabase/supabase-js` dependency: Storage's public-read
 * and object-upload operations are plain HTTP, and reaching for the full SDK
 * this close to a live demo means one more package that could break the build
 * for a feature that is three fetch calls. `videos.ts` talks to the REST API
 * directly.
 *
 * The anon key is meant to be public — it is embedded in the shipped JS bundle
 * either way, and Storage access is governed by the bucket's policies, not by
 * keeping this key secret. It must never be the `service_role` key, which
 * bypasses every policy.
 */

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const BUCKET = 'tutorials';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Public object URL. Reading it needs no auth once the bucket is public. */
export function publicVideoUrl(objectPath: string): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

/** Headers for authenticated Storage calls (upload/delete) with the anon key. */
export function authHeaders(): Record<string, string> {
  return { apikey: SUPABASE_ANON_KEY ?? '', Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}` };
}
