-- PetCareLog database schema. Run once in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null check (char_length(trim(name)) between 1 and 80),
  email varchar(254) not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  name varchar(80) not null check (char_length(trim(name)) between 1 and 80),
  species varchar(20) not null check (species in ('Dog','Cat','Bird','Rabbit','Other')),
  breed varchar(80),
  date_of_birth date check (date_of_birth is null or date_of_birth <= current_date),
  sex varchar(10) check (sex is null or sex in ('Female','Male')),
  notes varchar(1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  title varchar(120) not null check (char_length(trim(title)) between 1 and 120),
  type varchar(20) not null check (type in ('Vet visit','Vaccination','Medication','Grooming','Feeding','Other')),
  record_date date not null,
  next_due_date date,
  details varchar(2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_care_due_date check (next_due_date is null or next_due_date >= record_date)
);

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists care_records_pet_date_idx on public.care_records(pet_id, record_date desc);
create index if not exists care_records_due_date_idx on public.care_records(next_due_date) where next_due_date is not null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at before update on public.pets
for each row execute function public.set_updated_at();

drop trigger if exists care_records_set_updated_at on public.care_records;
create trigger care_records_set_updated_at before update on public.care_records
for each row execute function public.set_updated_at();

-- This starter app uses a server-side service-role key. The browser never connects
-- directly to these tables. RLS is enabled and direct client access is revoked;
-- Express checks ownership on every private route. Never expose the service key.
alter table public.app_users enable row level security;
alter table public.pets enable row level security;
alter table public.care_records enable row level security;

revoke all on public.app_users from anon, authenticated;
revoke all on public.pets from anon, authenticated;
revoke all on public.care_records from anon, authenticated;
