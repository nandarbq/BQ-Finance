-- Jalankan seluruh isi file ini di Supabase Dashboard > SQL Editor
-- Project > SQL Editor > New query > tempel semua > Run

-- Ekstensi untuk generate UUID (biasanya sudah aktif secara default di Supabase)
create extension if not exists "pgcrypto";

-- =========================================================
-- Tabel anggota (dipakai untuk mode "keluarga")
-- =========================================================
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
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
-- Tabel kategori (pemasukan & pengeluaran, per user)
-- =========================================================
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
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
  mode text not null check (mode in ('pribadi', 'keluarga')),
  category text not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_budgets_user_mode_cat on budgets (user_id, mode, category);

create index if not exists idx_transactions_user_mode on transactions (user_id, mode);
create index if not exists idx_transactions_user_date on transactions (user_id, date desc);
create index if not exists idx_members_user on members (user_id);

-- =========================================================
-- Row Level Security: setiap pengguna hanya bisa
-- melihat & mengubah datanya sendiri
-- =========================================================
alter table members enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table categories enable row level security;

drop policy if exists "members_select_own" on members;
create policy "members_select_own" on members
  for select using (auth.uid() = user_id);
drop policy if exists "members_insert_own" on members;
create policy "members_insert_own" on members
  for insert with check (auth.uid() = user_id);
drop policy if exists "members_delete_own" on members;
create policy "members_delete_own" on members
  for delete using (auth.uid() = user_id);

drop policy if exists "transactions_select_own" on transactions;
create policy "transactions_select_own" on transactions
  for select using (auth.uid() = user_id);
drop policy if exists "transactions_insert_own" on transactions;
create policy "transactions_insert_own" on transactions
  for insert with check (auth.uid() = user_id);
drop policy if exists "transactions_delete_own" on transactions;
create policy "transactions_delete_own" on transactions
  for delete using (auth.uid() = user_id);

drop policy if exists "budgets_select_own" on budgets;
create policy "budgets_select_own" on budgets
  for select using (auth.uid() = user_id);
drop policy if exists "budgets_insert_own" on budgets;
create policy "budgets_insert_own" on budgets
  for insert with check (auth.uid() = user_id);
drop policy if exists "budgets_update_own" on budgets;
create policy "budgets_update_own" on budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "budgets_delete_own" on budgets;
create policy "budgets_delete_own" on budgets
  for delete using (auth.uid() = user_id);

drop policy if exists "categories_select_own" on categories;
create policy "categories_select_own" on categories
  for select using (auth.uid() = user_id);
drop policy if exists "categories_insert_own" on categories;
create policy "categories_insert_own" on categories
  for insert with check (auth.uid() = user_id);
drop policy if exists "categories_update_own" on categories;
create policy "categories_update_own" on categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "categories_delete_own" on categories;
create policy "categories_delete_own" on categories
  for delete using (auth.uid() = user_id);
