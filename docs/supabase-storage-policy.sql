-- NeuroMotion AI — Storage policy for the "tutorials" bucket
--
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.
--
-- WHY THIS IS NEEDED
-- Marking a bucket "Public" only adds a SELECT (read) policy. Upload/replace/
-- delete are separate operations and are denied by default — which is why the
-- anon key got "new row violates row-level security policy" on upload.
--
-- WHAT THIS GRANTS
-- Anyone holding the anon key — which is public by design and ships inside
-- this app's own JS bundle — can upload, replace, and delete files in the
-- "tutorials" bucket ONLY. No other bucket, no other table, no database rows.
-- There is no admin login yet, so this is the only way the /admin upload
-- screen can work before the pitch. Treat it as open to the internet: rotate
-- or tighten it once real admin auth exists (see docs/pitch/2-...pdf §4).
--
-- Safe to re-run: each CREATE POLICY is guarded by a DROP POLICY IF EXISTS.

drop policy if exists "tutorials anon upload" on storage.objects;
create policy "tutorials anon upload"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'tutorials');

drop policy if exists "tutorials anon update" on storage.objects;
create policy "tutorials anon update"
  on storage.objects for update
  to anon
  using (bucket_id = 'tutorials')
  with check (bucket_id = 'tutorials');

drop policy if exists "tutorials anon delete" on storage.objects;
create policy "tutorials anon delete"
  on storage.objects for delete
  to anon
  using (bucket_id = 'tutorials');

-- Public read (in case the "Public bucket" toggle was not used, or was
-- reverted). Safe to run alongside the dashboard toggle — policies are
-- additive as long as their WITH CHECK / USING targets differ.
drop policy if exists "tutorials public read" on storage.objects;
create policy "tutorials public read"
  on storage.objects for select
  to anon
  using (bucket_id = 'tutorials');
