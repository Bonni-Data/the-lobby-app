-- THE LOBBY · migrations applied on project unyqeshkfkvijehnlnex on 16 October 2026.
--
-- mvp_36a_profile_avatar_column: profiles.avatar_url (only a photo in the member's own folder of the avatars bucket),
--   and members may update only display_name, preferred_language and avatar_url of their profile
--   (before, the API also let them change email_verified_at and invite_code).
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add constraint profiles_avatar_url_chk check (
  avatar_url is null or (length(avatar_url) <= 300
    and avatar_url like 'https://unyqeshkfkvijehnlnex.supabase.co/storage/v1/object/public/avatars/' || id::text || '/%')
);
revoke update on public.profiles from anon, authenticated;
grant update (display_name, preferred_language, avatar_url) on public.profiles to authenticated;

-- mvp_36b_avatars_bucket: public bucket, 512 KB per file, JPEG/WebP/PNG. The app uploads a 360x360 JPEG to <user id>/avatar.jpg.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- mvp_36c_avatars_policies: each member reads, writes and deletes only their own folder.
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- mvp_37_track_install_events: track() accepts 'install_click' and 'app_installed' (the «Aggiungi alla Home» card).
-- mvp_37b_usage_metrics_installs: usage_metrics() = usage_metrics_core() || install_clicks_7d, installs_7d, installs_total.
-- The account edge function (v5) exports avatar_url and deletes the photo when the account is deleted.
