-- Jalankan file ini di Supabase Dashboard > SQL Editor
-- Jalankan SETELAH schema.sql dan 002_profile_persistence.sql, boleh berulang (idempoten).
--
-- Tujuan: label anggota di tabel "members" (mis. "Ayah", "Ibu") bisa
-- ditautkan ke akun family_members. Setelah tertaut, label ikut memakai
-- nama dan foto profil akun tersebut, dan ikut berubah real-time ketika
-- pemilik akunnya mengganti nama atau foto.
--
-- CATATAN: file ini membuat trigger yang menulis ke tabel "members".
-- Ambil backup database lebih dulu.

-- =========================================================
-- 1. Kolom baru di tabel members
-- =========================================================
alter table members add column if not exists linked_user_id uuid references auth.users (id) on delete set null;
alter table members add column if not exists display_name text;
alter table members add column if not exists avatar_url text;

create index if not exists idx_members_linked_user on members (linked_user_id);

-- =========================================================
-- 2. Trigger: salin nama + foto dari family_members ke members
-- Dipakai supaya rename/ganti-foto otomatis flows ke semua label yang
-- tertaut, tanpa perlu logika di client.
-- =========================================================
create or replace function public.sync_member_profile_from_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update members
     set display_name = new.display_name,
         avatar_url = new.avatar_url
   where linked_user_id = new.user_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_member_profile on family_members;
create trigger trg_sync_member_profile
after update of display_name, avatar_url on family_members
for each row
execute function public.sync_member_profile_from_family();

-- Backfill: isi display_name/avatar_url untuk label yang SUAH tertaut
-- (mis. dari instalasi sebelumnya atau tautan manual).
update members m
   set display_name = fm.display_name,
       avatar_url = fm.avatar_url
  from family_members fm
 where fm.user_id = m.linked_user_id
   and (m.display_name is distinct from fm.display_name
     or m.avatar_url is distinct from fm.avatar_url);

-- =========================================================
-- 3. Realtime
-- Tabel members belum ada di publication, jadi perubahan label
-- tidak pernah live-sync ke anggota lain. Tambahkan.
-- =========================================================
do $$
begin
  alter publication supabase_realtime add table members;
exception
  when duplicate_object then
    null;
end $$;

-- =========================================================
-- 4. RPC tautkan / lepas label ke akun sendiri
-- Sengaja hanya untuk akun sendiri (auth.uid()) supaya tidak ada
-- anggota keluarga yang bisa "membajak" label milik orang lain.
-- =========================================================
create or replace function public.link_member_to_account(target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  fm family_members;
begin
  if me is null then
    raise exception 'Unauthenticated';
  end if;

  select * into fm from family_members where user_id = me;
  if fm.id is null then
    raise exception 'Belum gabung keluarga';
  end if;

  update members m
     set linked_user_id = me,
         display_name = fm.display_name,
         avatar_url = fm.avatar_url
   where m.id = target_member_id
     and m.family_id = fm.family_id
     and (m.linked_user_id is null or m.linked_user_id = me);

  if not found then
    raise exception 'Anggota tidak ditemukan, atau sudah ditautkan ke akun lain';
  end if;
end;
$$;

create or replace function public.unlink_member_from_account(target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Unauthenticated';
  end if;

  update members m
     set linked_user_id = null,
         display_name = null,
         avatar_url = null
   where m.id = target_member_id
     and m.linked_user_id = me;

  if not found then
    raise exception 'Anggota tidak ditemukan, atau bukan milikmu';
  end if;
end;
$$;

-- =========================================================
-- 5. Izin eksekusi
-- =========================================================
revoke all on function public.link_member_to_account(uuid) from public, anon;
grant execute on function public.link_member_to_account(uuid) to authenticated;

revoke all on function public.unlink_member_from_account(uuid) from public, anon;
grant execute on function public.unlink_member_from_account(uuid) to authenticated;

-- =========================================================
-- 6. Sanity check
-- Kolom harus ada, publication harus memuat 2 tabel.
-- =========================================================
-- select column_name from information_schema.columns
--  where table_name = 'members' and column_name in ('linked_user_id','display_name','avatar_url')
--  order by column_name;
--
-- select tablename from pg_publication_tables where pubname = 'supabase_realtime'
--  order by tablename;