-- Jalankan file ini di Supabase Dashboard > SQL Editor
-- Jalankan SETELAH schema.sql, boleh berulang (idempoten).
--
-- Tujuan:
--   1. Menyimpan foto profil di Supabase Storage (bukan base64 di kolom text).
--   2. Memastikan RPC update_my_family_avatar / update_my_family_name benar-benar ada.
--   3. Menutup fungsi profile RPC untuk anon (schema.sql hanya menutup yang "name").
--
-- Sebelum menjalankan, cek dulu apakah RPC-nya sudah ada:
--
--   select p.proname, p.prosecdef
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in ('update_my_family_avatar','update_my_family_name','is_family_member');
--
-- Kalau "update_my_family_avatar" atau "update_my_family_name" tidak muncul,
-- berarti itu penyebab foto/nama tidak tersinkron ke anggota lain.

-- =========================================================
-- 1. Bucket foto profil
-- Public: path memakai UUID user sehingga mustahil ditebak, dan kolom
-- avatar_url yang berisi URL membuat payload realtime tetap kecil
-- (bandingkan dengan base64 512x512 yang bisa 60-120 KB per baris).
-- =========================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Semua orang boleh baca. URL-nya berisi UUID user sehingga tidak bisa
-- ditebak, dan kolom avatar_url hanya bisa dibaca anggota keluarga.
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Hanya user yang owns folder-nya yang boleh tulis / hapus.
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================
-- 2. RPC simpan nama tampilan
-- Dipanggil ulang supaya pasti ada di database.
-- =========================================================
create or replace function public.update_my_family_name(target_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;
  update family_members
     set display_name = nullif(btrim(coalesce(target_name, '')), '')
   where user_id = auth.uid();
end;
$$;

-- =========================================================
-- 3. RPC simpan URL foto profil
-- Sekarang menerima URL Storage (bukan base64). Nilai lama yang masih
-- base64 tetap aman: kolomnya text dan UI bisa menampilkan keduanya.
-- =========================================================
create or replace function public.update_my_family_avatar(target_avatar_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;
  update family_members
     set avatar_url = nullif(btrim(coalesce(target_avatar_url, '')), '')
   where user_id = auth.uid();
end;
$$;

-- =========================================================
-- 4. Izin eksekusi
-- schema.sql hanya menutup update_my_family_name; yang avatar belum ditutup
-- sehingga secara default bisa dipanggil oleh anon. Tutup keduanya.
-- =========================================================
revoke all on function public.update_my_family_name(text) from public, anon;
grant execute on function public.update_my_family_name(text) to authenticated;

revoke all on function public.update_my_family_avatar(text) from public, anon;
grant execute on function public.update_my_family_avatar(text) to authenticated;

-- =========================================================
-- 5. Sanity check
-- Jalankan setelah Run. Diharapkan 3 baris.
-- =========================================================
-- select p.proname, p.prosecdef
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('update_my_family_avatar','update_my_family_name','is_family_member');