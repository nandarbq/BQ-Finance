-- Jalankan file ini di Supabase Dashboard > SQL Editor
-- Jalankan SETELAH schema.sql, 002_profile_persistence.sql, dan 003_member_linking.sql.
-- Boleh berulang (idempoten).
--
-- Tujuan: kartu "Anggota keluarga" (label di tabel members) lebih ketat:
--   1. Tambah & hapus label hanya BOLEH kepala keluarga.
--   2. Anggota biasa hanya bisa menautkan/melepas tautan ke akunnya sendiri.
--   3. Kepala keluarga bisa menautkan label ke akun anggota mana pun
--      (pilih tujuan) dan melepas tautan label siapa pun di keluarganya.

-- =========================================================
-- 1. Helper: apakah pemanggil kepala keluarga family ini?
-- Pola SECURITY DEFINER sama dengan is_family_member() di schema.sql
-- supaya tidak infinite recursion dengan policy RLS family_members.
-- =========================================================
create or replace function public.is_family_head(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id = target_family_id
      and fm.role = 'kepala_keluarga'
  );
$$;

-- =========================================================
-- 2. RLS tabel members: tambah & hapus hanya kepala keluarga
-- Label pribadi (family_id is null) tetap dikelola pemiliknya.
-- Pengecualian built_in hanya untuk seed label "Bersama" saat
-- keluarga belum punya label sama sekali (lihat fetchMembers()).
-- =========================================================
drop policy if exists "members_insert_shared" on members;
create policy "members_insert_shared" on members
  for insert with check (
    (family_id is null and user_id = auth.uid())
    or (public.is_family_head(family_id) and user_id = auth.uid())
    or (
      public.is_family_member(family_id)
      and built_in
      and not exists (
        select 1 from members m2
        where m2.family_id = members.family_id
          and m2.built_in
      )
    )
  );

drop policy if exists "members_delete_shared" on members;
create policy "members_delete_shared" on members
  for delete using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_head(family_id)
  );

-- =========================================================
-- 3. RPC link: kepala keluarga bisa memilih akun tujuan
--    target_user_id null / = sendiri  -> tautkan ke akun sendiri
--                                        (anggota biasa, perilaku lama)
--    target_user_id orang lain       -> hanya kepala keluarga,
--                                        target harus anggota keluarga
-- =========================================================
drop function if exists public.link_member_to_account(uuid);

create or replace function public.link_member_to_account(
  target_member_id uuid,
  target_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  fm family_members;
  link_target uuid;
  target_fm family_members;
begin
  if me is null then
    raise exception 'Unauthenticated';
  end if;

  select * into fm from family_members where user_id = me;
  if fm.id is null then
    raise exception 'Belum gabung keluarga';
  end if;

  link_target := coalesce(target_user_id, me);

  -- Tautkan ke akun orang lain: hanya kepala keluarga.
  if link_target <> me and fm.role <> 'kepala_keluarga' then
    raise exception 'Hanya kepala keluarga yang bisa menautkan anggota ke akun lain.';
  end if;

  -- Anggota biasa menautkan ke akun sendiri: hanya label kosong / miliknya.
  if link_target = me and fm.role <> 'kepala_keluarga' then
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
    return;
  end if;

  -- Kepala keluarga: boleh menautkan ke dirinya sendiri atau akun anggota
  -- lain, termasuk menimpa tautan label yang sudah ada.
  select * into target_fm
    from family_members
   where user_id = link_target
     and family_id = fm.family_id;
  if target_fm.id is null then
    raise exception 'Akun tujuan bukan anggota keluarga ini';
  end if;

  update members m
     set linked_user_id = link_target,
         display_name = target_fm.display_name,
         avatar_url = target_fm.avatar_url
   where m.id = target_member_id
     and m.family_id = fm.family_id;

  if not found then
    raise exception 'Anggota tidak ditemukan';
  end if;
end;
$$;

-- =========================================================
-- 4. RPC unlink: kepala keluarga boleh melepas tautan label
--    siapa pun di keluarganya; anggota hanya tautan miliknya.
-- =========================================================
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
     and (
       m.linked_user_id = me
       or public.is_family_head(m.family_id)
     );

  if not found then
    raise exception 'Anggota tidak ditemukan, atau bukan milikmu';
  end if;
end;
$$;

-- =========================================================
-- 5. Izin eksekusi
-- =========================================================
revoke all on function public.link_member_to_account(uuid, uuid) from public, anon;
grant execute on function public.link_member_to_account(uuid, uuid) to authenticated;

revoke all on function public.unlink_member_from_account(uuid) from public, anon;
grant execute on function public.unlink_member_from_account(uuid) to authenticated;

revoke all on function public.is_family_head(uuid) from public, anon;
grant execute on function public.is_family_head(uuid) to authenticated;

-- =========================================================
-- 6. Sanity check
-- =========================================================
-- select proname, pg_get_function_identity_arguments(oid)
--   from pg_proc where proname = 'link_member_to_account';
--
-- select polname, qual from pg_policies
--   where tablename = 'members' and cmd in ('INSERT','DELETE');
