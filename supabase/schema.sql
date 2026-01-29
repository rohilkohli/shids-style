-- Supabase schema for SHIDS backend

create extension if not exists "uuid-ossp";

create table if not exists public.products (
  id text primary key,
  slug text unique not null,
  name text not null,
  description text not null,
  category text not null,
  price numeric not null,
  original_price numeric,
  discount_percent numeric,
  stock integer not null default 0,
  rating numeric,
  badge text,
  tags jsonb default '[]'::jsonb,
  colors jsonb default '[]'::jsonb,
  sizes jsonb default '[]'::jsonb,
  highlights jsonb default '[]'::jsonb,
  images jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  email text not null,
  address text not null,
  notes text,
  status text not null,
  subtotal numeric,
  shipping_fee numeric,
  total numeric not null,
  payment_proof text,
  payment_verified boolean not null default false,
  awb_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity integer not null,
  color text,
  size text,
  price numeric not null
);

create table if not exists public.discount_codes (
  id text primary key,
  code text unique not null,
  description text,
  type text not null,
  value numeric not null,
  max_uses integer,
  used_count integer not null default 0,
  expiry_date timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  phone text,
  role text not null default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_emails (
  id bigserial primary key,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.hero_products (
  id bigserial primary key,
  product_id text not null references public.products(id) on delete restrict,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id)
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'SHIDS Member'),
    coalesce(new.raw_app_meta_data->>'role', 'customer')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.discount_codes enable row level security;
alter table public.profiles enable row level security;
alter table public.newsletter_emails enable row level security;
alter table public.hero_products enable row level security;
