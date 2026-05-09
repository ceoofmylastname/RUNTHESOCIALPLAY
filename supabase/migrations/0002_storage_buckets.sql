-- =====================================================================
-- 0002_storage_buckets.sql
-- Storage buckets + access policies.
--
-- Two private buckets, signed-URL access only. Workers (service role)
-- write; users read-via-signed-URL.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('brand-assets', 'brand-assets', false),
  ('post-assets',  'post-assets',  false)
on conflict (id) do nothing;

-- brand-assets: users upload via the web app (signed upload URL flow);
-- read access policies allow them to retrieve their own files.
create policy "users read own brand-assets storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users upload own brand-assets storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own brand-assets storage"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- post-assets: only workers (service role) write. Users read via signed URLs
-- delivered through the bundle, but for direct reads (preview/download in-app),
-- allow them to read files under their own user id prefix.
create policy "users read own post-assets storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'post-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Convention: storage paths begin with `<user_id>/...` so the foldername
-- predicate above correctly scopes to the owner.
