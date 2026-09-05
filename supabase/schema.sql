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

create index if not exists idx_transactions_user_mode on transactions (user_id, mode);
create index if not exists idx_transactions_user_date on transactions (user_id, date desc);
create index if not exists idx_members_user on members (user_id);

-- =========================================================
-- Row Level Security: setiap pengguna hanya bisa
-- melihat & mengubah datanya sendiri
-- =========================================================
alter table members enable row level security;
alter table transactions enable row level security;

create policy "members_select_own" on members
  for select using (auth.uid() = user_id);
create policy "members_insert_own" on members
  for insert with check (auth.uid() = user_id);
create policy "members_delete_own" on members
  for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_delete_own" on transactions
  for delete using (auth.uid() = user_id);
