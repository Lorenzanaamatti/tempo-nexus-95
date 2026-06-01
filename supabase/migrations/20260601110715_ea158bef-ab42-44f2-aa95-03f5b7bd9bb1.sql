
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles self upsert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid());

-- PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  artist text,
  kind text not null default 'project',
  color text default '#a78bfa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "projects owner all" on public.projects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- BUDGETS
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  scope text not null default 'project',
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;
alter table public.budgets enable row level security;
create policy "budgets owner all" on public.budgets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- BUDGET LINES (8 fixed columns)
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  concept text not null,
  category text,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  net numeric generated always as (quantity * unit_price) stored,
  vat_rate numeric not null default 21,
  irpf_rate numeric not null default 0,
  notes text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.budget_lines to authenticated;
grant all on public.budget_lines to service_role;
alter table public.budget_lines enable row level security;
create policy "budget_lines owner all" on public.budget_lines for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- INVOICES
create type public.invoice_status as enum ('pending', 'paid', 'grouped', 'overdue', 'draft');
create type public.invoice_direction as enum ('income', 'expense');

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  budget_id uuid references public.budgets(id) on delete set null,
  number text,
  issuer text,
  receiver text,
  direction public.invoice_direction not null default 'income',
  status public.invoice_status not null default 'pending',
  issue_date date not null default current_date,
  due_date date,
  net numeric not null default 0,
  vat numeric not null default 0,
  irpf numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "invoices owner all" on public.invoices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_projects before update on public.projects for each row execute function public.touch_updated_at();
create trigger touch_budgets before update on public.budgets for each row execute function public.touch_updated_at();
create trigger touch_invoices before update on public.invoices for each row execute function public.touch_updated_at();
