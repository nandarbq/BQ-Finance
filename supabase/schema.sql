-- Jalankan seluruh isi file ini di Supabase Dashboard > SQL Editor
-- Project > SQL Editor > New query > tempel semua > Run

-- Ekstensi untuk generate UUID (biasanya sudah aktif secara default di Supabase)
create extension if not exists "pgcrypto";

-- =========================================================
-- Tabel rumah tangga / keluarga bersama (multi-user)
-- =========================================================
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Keluarga',
  created_at timestamptz not null default now()
);

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('kepala_keluarga', 'member')) default 'member',
  email text,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists family_joins (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  invite_code text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_family_joins_code on family_joins (invite_code);

-- =========================================================
-- Tabel anggota (dipakai untuk mode "keluarga")
-- =========================================================
-- Kolom family_id di tabel lama ditambahkan otomatis di blok ALTER TABLE
-- (lihat "Tambahkan kolom family_id" sebelum blok migrasi data lama).
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid references families (id) on delete cascade,
  name text not null,
  color text not null default '#4FB0A5',
  built_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Tabel transaksi (pemasukan & pengeluaran)
-- =========================================================
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid references families (id) on delete cascade,
  mode text not null check (mode in ('pribadi', 'keluarga')),
  type text not null check (type in ('in', 'out')),
  amount numeric not null check (amount > 0),
  category text not null,
  note text not null default '',
  date date not null,
  member_id uuid references members (id) on delete set null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Tabel kategori (pemasukan & pengeluaran)
-- =========================================================
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid references families (id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  label text not null,
  icon text not null default 'MoreHorizontal',
  color text not null default 'var(--text-muted)',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Bersihkan kategori duplikat (jika pernah ter-seed ganda): simpan baris paling awal saja
delete from categories a
  using categories b
  where a.id <> b.id
    and a.user_id = b.user_id
    and a.type = b.type
    and a.label = b.label;

-- Unique agar seed default tidak pernah dobel (dipakai juga oleh onConflict DO NOTHING)
drop index if exists idx_categories_user;
create unique index if not exists idx_categories_user_type_label on categories (user_id, type, label);

-- =========================================================
-- Tabel anggaran (limit pengeluaran per kategori per bulan)
-- =========================================================
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid references families (id) on delete cascade,
  mode text not null check (mode in ('pribadi', 'keluarga')),
  category text not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_budgets_user_mode_cat on budgets (user_id, mode, category);

-- Tambahkan kolom family_id pada tabel lama yang sudah ada sebelumnya.
-- create table if not exists tidak menambah kolom baru ke tabel yang sudah ada,
-- sehingga kolom ini dijamin ada juga untuk project yang sudah pernah menjalankan schema lama.
-- (Harus dijalankan SEBELUM semua index yang memakai kolom family_id di bawah.)
alter table members add column if not exists family_id uuid references families (id) on delete cascade;
alter table transactions add column if not exists family_id uuid references families (id) on delete cascade;
alter table budgets add column if not exists family_id uuid references families (id) on delete cascade;
alter table categories add column if not exists family_id uuid references families (id) on delete cascade;

create index if not exists idx_transactions_user_mode on transactions (user_id, mode);
create index if not exists idx_transactions_user_date on transactions (user_id, date desc);
create index if not exists idx_transactions_family on transactions (family_id);
create index if not exists idx_budgets_family on budgets (family_id);
create index if not exists idx_categories_family on categories (family_id);
create index if not exists idx_members_user on members (user_id);
create index if not exists idx_members_family on members (family_id);
create index if not exists idx_family_joins_family on family_joins (family_id);
create index if not exists idx_family_members_family on family_members (family_id);

-- =========================================================
-- Migrasi data lama: user yang sudah punya data keluarga otomatis
-- dibuatkan satu keluarga (dirinya sebagai kepala keluarga),
-- lalu seluruh data keluarganya ditautkan ke keluarga itu.
-- Idempoten: user yang sudah punya entri family_members dilewati.
-- =========================================================
do $$
declare
  f record;
  fid uuid;
begin
  for f in
    select distinct u.user_id
    from (
      select user_id from transactions where mode = 'keluarga'
      union
      select user_id from budgets where mode = 'keluarga'
      union
      select user_id from members
    ) u
    where not exists (select 1 from family_members fm where fm.user_id = u.user_id)
  loop
    insert into families (name) values ('Keluarga') returning id into fid;
    insert into family_members (family_id, user_id, role, email)
      values (fid, f.user_id, 'kepala_keluarga', (select email from auth.users au where au.id = f.user_id));
    update transactions set family_id = fid where user_id = f.user_id and mode = 'keluarga';
    update budgets set family_id = fid where user_id = f.user_id and mode = 'keluarga';
    update members set family_id = fid where user_id = f.user_id;
    update categories set family_id = fid where user_id = f.user_id;
    insert into family_joins (family_id, invite_code, created_by)
      values (fid, upper(substr(md5(random()::text),1,4) || substr(md5(random()::text),1,4)), f.user_id);
  end loop;
end $$;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table families enable row level security;
alter table family_members enable row level security;
alter table family_joins enable row level security;
alter table members enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table categories enable row level security;

-- Helper anggota keluarga dengan SECURITY DEFINER agar policy tidak ber-rekursi.
-- Query policy yang mengecek family_members secara inline akan memicu policy
-- family_members itu sendiri (infinite recursion / 42P17). Fungsi ini menembus
-- RLS sehingga dipakai oleh semua policy di bawah.
create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from family_members fm
    where fm.user_id = auth.uid() and fm.family_id = target_family_id
  );
$$;

-- --- families: hanya bisa dilihat anggota; semua perubahan lewat RPC security definer ---
drop policy if exists "families_select_member" on families;
create policy "families_select_member" on families
  for select using (public.is_family_member(families.id));

-- --- family_members: hanya bisa dilihat anggota; join/keluar/hapus lewat RPC ---
drop policy if exists "family_members_select_shared" on family_members;
create policy "family_members_select_shared" on family_members
  for select using (public.is_family_member(family_members.family_id));

-- --- family_joins: tanpa policy; akses hanya lewat RPC (security definer) ---

-- --- members ---
drop policy if exists "members_select_own" on members;
drop policy if exists "members_insert_own" on members;
drop policy if exists "members_update_own" on members;
drop policy if exists "members_delete_own" on members;
drop policy if exists "members_select_shared" on members;
drop policy if exists "members_insert_shared" on members;
drop policy if exists "members_update_shared" on members;
drop policy if exists "members_delete_shared" on members;
create policy "members_select_shared" on members
  for select using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );
create policy "members_insert_shared" on members
  for insert with check (
    (family_id is null and user_id = auth.uid())
    or (public.is_family_member(family_id) and user_id = auth.uid())
  );
create policy "members_update_shared" on members
  for update using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  ) with check (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );
create policy "members_delete_shared" on members
  for delete using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );

-- --- transactions ---
drop policy if exists "transactions_select_own" on transactions;
drop policy if exists "transactions_insert_own" on transactions;
drop policy if exists "transactions_update_own" on transactions;
drop policy if exists "transactions_delete_own" on transactions;
drop policy if exists "transactions_select_shared" on transactions;
drop policy if exists "transactions_insert_shared" on transactions;
drop policy if exists "transactions_update_shared" on transactions;
drop policy if exists "transactions_delete_shared" on transactions;
create policy "transactions_select_shared" on transactions
  for select using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );
create policy "transactions_insert_shared" on transactions
  for insert with check (
    (family_id is null and user_id = auth.uid())
    or (public.is_family_member(family_id) and user_id = auth.uid())
  );
create policy "transactions_update_shared" on transactions
  for update using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  ) with check (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );
create policy "transactions_delete_shared" on transactions
  for delete using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );

-- --- budgets ---
drop policy if exists "budgets_select_own" on budgets;
drop policy if exists "budgets_insert_own" on budgets;
drop policy if exists "budgets_update_own" on budgets;
drop policy if exists "budgets_delete_own" on budgets;
drop policy if exists "budgets_select_shared" on budgets;
drop policy if exists "budgets_insert_shared" on budgets;
drop policy if exists "budgets_update_shared" on budgets;
drop policy if exists "budgets_delete_shared" on budgets;
create policy "budgets_select_shared" on budgets
  for select using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );
create policy "budgets_insert_shared" on budgets
  for insert with check (
    (family_id is null and user_id = auth.uid())
    or (public.is_family_member(family_id) and user_id = auth.uid())
  );
create policy "budgets_update_shared" on budgets
  for update using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  ) with check (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );
create policy "budgets_delete_shared" on budgets
  for delete using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );

-- --- categories ---
drop policy if exists "categories_select_own" on categories;
drop policy if exists "categories_insert_own" on categories;
drop policy if exists "categories_update_own" on categories;
drop policy if exists "categories_delete_own" on categories;
drop policy if exists "categories_select_shared" on categories;
drop policy if exists "categories_insert_shared" on categories;
drop policy if exists "categories_update_shared" on categories;
drop policy if exists "categories_delete_shared" on categories;
create policy "categories_select_shared" on categories
  for select using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );
create policy "categories_insert_shared" on categories
  for insert with check (
    (family_id is null and user_id = auth.uid())
    or (public.is_family_member(family_id) and user_id = auth.uid())
  );
create policy "categories_update_shared" on categories
  for update using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  ) with check (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );
create policy "categories_delete_shared" on categories
  for delete using (
    (family_id is null and user_id = auth.uid())
    or public.is_family_member(family_id)
  );

-- =========================================================
-- Fungsi RPC (security definer) untuk manajemen keluarga
-- =========================================================

create or replace function make_join_code()
returns text
language sql
as $$
  select upper(substr(md5(random()::text), 1, 4) || substr(md5(random()::text), 1, 4));
$$;

-- Buat keluarga baru, jadikan user sebagai kepala keluarga.
create or replace function create_family()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;
  if exists (select 1 from family_members where user_id = auth.uid()) then
    raise exception 'Kamu sudah tergabung di sebuah keluarga.';
  end if;
  insert into families (name) values ('Keluarga') returning id into new_id;
  insert into family_members (family_id, user_id, role, email)
    values (new_id, auth.uid(), 'kepala_keluarga', auth.jwt()->>'email');
  insert into family_joins (family_id, invite_code, created_by)
    values (new_id, make_join_code(), auth.uid());
  return new_id;
end;
$$;

-- Ambil kode undangan keluarga (membuat baru bila belum ada).
create or replace function get_join_code(target_family_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  n int;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;
  if not exists (select 1 from family_members where family_id = target_family_id and user_id = auth.uid()) then
    raise exception 'Kamu bukan anggota keluarga ini.';
  end if;
  select invite_code into code from family_joins where family_id = target_family_id limit 1;
  if code is null then
    loop
      code := make_join_code();
      select count(*) into n from family_joins where invite_code = code;
      exit when n = 0;
    end loop;
    insert into family_joins (family_id, invite_code, created_by) values (target_family_id, code, auth.uid());
  end if;
  return code;
end;
$$;

-- Buat kode undangan baru (kode lama otomatis tidak berlaku).
create or replace function regenerate_join_code(target_family_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  n int;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;
  if not exists (select 1 from family_members where family_id = target_family_id and user_id = auth.uid() and role = 'kepala_keluarga') then
    raise exception 'Hanya kepala keluarga yang bisa membuat kode undangan baru.';
  end if;
  loop
    code := make_join_code();
    select count(*) into n from family_joins where invite_code = code;
    exit when n = 0;
  end loop;
  delete from family_joins where family_id = target_family_id;
  insert into family_joins (family_id, invite_code, created_by) values (target_family_id, code, auth.uid());
  return code;
end;
$$;

-- Gabung ke keluarga lewat kode undangan.
create or replace function join_family_by_code(target_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  target_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;
  if exists (select 1 from family_members where user_id = auth.uid()) then
    raise exception 'Kamu sudah tergabung di sebuah keluarga. Keluar dulu jika ingin pindah.';
  end if;
  normalized := upper(regexp_replace(coalesce(target_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if normalized = '' then
    raise exception 'Masukkan kode undangan.';
  end if;
  select family_id into target_family_id from family_joins where invite_code = normalized limit 1;
  if target_family_id is null then
    raise exception 'Kode undangan tidak ditemukan. Periksa kembali kodenya.';
  end if;
  insert into family_members (family_id, user_id, role, email)
    values (target_family_id, auth.uid(), 'member', auth.jwt()->>'email');
  return target_family_id;
end;
$$;

-- Keluar dari keluarga. Kepala keluarga: kepemimpinan pindah ke anggota lain,
-- atau seluruh keluarga (beserta datanya) dihapus bila sendirian.
create or replace function leave_family()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
  my_role text;
  heir record;
  others int;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;
  select fm.family_id, fm.role into fid, my_role from family_members fm where fm.user_id = auth.uid();
  if fid is null then
    raise exception 'Kamu tidak tergabung di keluarga mana pun.';
  end if;
  if my_role = 'kepala_keluarga' then
    select count(*) into others from family_members where family_id = fid and user_id <> auth.uid();
    if others > 0 then
      select * into heir from family_members where family_id = fid and user_id <> auth.uid() order by created_at, id limit 1;
      update family_members set role = 'kepala_keluarga' where id = heir.id;
    else
      -- tidak ada anggota lain: hapus seluruh keluarga (data keluarga ikut terhapus via cascade)
      delete from families where id = fid;
      return null;
    end if;
  end if;
  delete from family_members where family_id = fid and user_id = auth.uid();
  return fid;
end;
$$;

-- Hapus anggota lain dari keluarga (hanya kepala keluarga).
create or replace function remove_family_member(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;
  select fm.family_id into fid from family_members fm where fm.user_id = auth.uid() and fm.role = 'kepala_keluarga';
  if fid is null then
    raise exception 'Hanya kepala keluarga yang bisa menghapus anggota.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Gunakan "Keluar dari keluarga" untuk diri sendiri.';
  end if;
  delete from family_members where family_id = fid and user_id = target_user_id;
end;
$$;