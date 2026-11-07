
create type public.app_role as enum ('client','professional');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed in" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r text := coalesce(new.raw_user_meta_data->>'account_type','client');
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), coalesce(new.raw_user_meta_data->>'phone',''));
  insert into public.user_roles (user_id, role)
  values (new.id, case when r = 'professional' then 'professional'::app_role else 'client'::app_role end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique,
  name text not null,
  category text not null default 'Beleza e estética',
  location text not null default '',
  bio text not null default '',
  opens_at time not null default '09:00',
  closes_at time not null default '18:00',
  days int[] not null default '{1,2,3,4,5,6}',
  slot_interval int not null default 30,
  emoji text not null default '✨',
  rating numeric not null default 5,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.businesses to anon;
grant select, insert, update, delete on public.businesses to authenticated;
grant all on public.businesses to service_role;
alter table public.businesses enable row level security;
create policy "published visible" on public.businesses for select to anon, authenticated using (published or owner_id = auth.uid());
create policy "pro creates own" on public.businesses for insert to authenticated with check (owner_id = auth.uid() and public.has_role(auth.uid(),'professional'));
create policy "owner updates" on public.businesses for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes" on public.businesses for delete to authenticated using (owner_id = auth.uid());

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration int not null default 30,
  price numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services visible" on public.services for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.published or b.owner_id = auth.uid())));
create policy "owner manages services" on public.services for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  client_id uuid not null,
  service_name text not null,
  duration int not null,
  price numeric not null,
  date date not null,
  time time not null,
  notes text not null default '',
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','done')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "client or owner reads" on public.bookings for select to authenticated
  using (client_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "client books" on public.bookings for insert to authenticated with check (client_id = auth.uid());
create policy "client or owner updates" on public.bookings for update to authenticated
  using (client_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create or replace function public.check_booking_overlap()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'confirmed' and exists (
    select 1 from public.bookings x
    where x.business_id = new.business_id and x.date = new.date and x.status = 'confirmed' and x.id <> new.id
      and x.time < new.time + make_interval(mins => new.duration)
      and new.time < x.time + make_interval(mins => x.duration)
  ) then
    raise exception 'Este horário acabou de ser reservado. Escolha outro.';
  end if;
  return new;
end $$;
create trigger bookings_overlap before insert or update on public.bookings for each row execute function public.check_booking_overlap();

create or replace function public.get_busy_slots(_business_id uuid, _date date)
returns table(start_time time, duration int) language sql stable security definer set search_path = public
as $$ select time, duration from public.bookings where business_id = _business_id and date = _date and status = 'confirmed' $$;
grant execute on function public.get_busy_slots(uuid, date) to anon, authenticated;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  sender_id uuid not null,
  body text not null,
  urgent boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "participants read" on public.messages for select to authenticated
  using (client_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "participants send" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and (client_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())));
alter publication supabase_realtime add table public.messages;

insert into public.businesses (name, category, location, bio, opens_at, closes_at, days, emoji, rating, published) values
 ('Ateliê da Marina','Unhas','Centro · 0,8 km','Cuidado e cor para suas mãos.','09:00','18:00','{1,2,3,4,5,6}','💅',4.9,true),
 ('Barbearia do Rafa','Barbearia','Vila Nova · 1,2 km','Corte clássico, conversa boa.','09:00','19:00','{2,3,4,5,6}','💈',4.8,true),
 ('Studio Lumi','Estética','Aldeota · 2,1 km','Limpeza de pele e bem-estar.','10:00','20:00','{1,2,3,4,5}','🌿',4.7,true);
insert into public.services (business_id, name, duration, price)
select b.id, s.name, s.duration, s.price from public.businesses b
join (values
 ('Ateliê da Marina','Manicure tradicional',45,45),('Ateliê da Marina','Banho de gel',75,85),('Ateliê da Marina','Pedicure',50,50),
 ('Barbearia do Rafa','Corte masculino',40,55),('Barbearia do Rafa','Barba',30,35),('Barbearia do Rafa','Corte + barba',65,80),
 ('Studio Lumi','Limpeza de pele',60,120),('Studio Lumi','Design de sobrancelha',30,40)
) as s(bname,name,duration,price) on s.bname = b.name;
