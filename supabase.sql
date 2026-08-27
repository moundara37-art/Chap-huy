-- SUPABASE SQL: បញ្ជីអ្នកជំពាក់លុយថ្លៃអីវ៉ាន់ (៛)
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  item text not null,
  amount bigint not null check (amount > 0),
  debt_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount bigint not null check (amount > 0),
  payment_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;
alter table public.debts enable row level security;
alter table public.payments enable row level security;

drop policy if exists "customers own rows" on public.customers;
create policy "customers own rows" on public.customers
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "debts own rows" on public.debts;
create policy "debts own rows" on public.debts
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "payments own rows" on public.payments;
create policy "payments own rows" on public.payments
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- IMPORTANT:
-- Auth > Users > Add user ដើម្បីបង្កើត email/password សម្រាប់ Login។
-- បន្ទាប់មកយក Project URL និង Publishable/Anon key ទៅដាក់ក្នុង config.js។
