-- Supabase schema for SHIDS backend

-- ==========================================
-- 1. EXTENSIONS & CONFIGURATION
-- ==========================================
create extension if not exists "uuid-ossp";

-- ==========================================
-- 2. TABLE DEFINITIONS
-- ==========================================

-- 2.1 Products (Main Info)
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
  bestseller boolean not null default false,
  sku text,
  tags jsonb default '[]'::jsonb,
  colors jsonb default '[]'::jsonb,
  sizes jsonb default '[]'::jsonb,
  highlights jsonb default '[]'::jsonb,
  images jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.1.1 Product Categories
create table if not exists public.categories (
  id bigserial primary key,
  name text unique not null,
  slug text unique not null,
  featured_product_id text references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2.2 Product Variants (Specific Size/Color Inventory)
create table if not exists public.product_variants (
  id bigserial primary key,
  product_id text references public.products(id) on delete cascade,
  size text,
  color text,
  stock integer not null default 0,
  unique(product_id, size, color)
);

-- 2.3 Orders
create table if not exists public.orders (
  id text primary key,
  email text not null,
  address text not null,
  notes text,
  status text not null,
  subtotal numeric,
  shipping_fee numeric,
  discount_code text,
  discount_amount numeric,
  total numeric not null,
  payment_verified boolean not null default false,
  awb_number text,
  courier_name text,
  created_at timestamptz not null default now()
);

-- 2.4 Order Items
create table if not exists public.order_items (
  id bigserial primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity integer not null,
  color text,
  size text,
  price numeric not null
);

-- 2.5 Discount Codes
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

-- 2.6 User Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  role text not null default 'customer',
  created_at timestamptz not null default now()
);

-- 2.7 Newsletter
create table if not exists public.newsletter_emails (
  id bigserial primary key,
  email text unique not null,
  created_at timestamptz not null default now()
);

-- 2.7.1 Contact Messages
create table if not exists public.contact_messages (
  id bigserial primary key,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- 2.8 Hero Products (Carousel)
create table if not exists public.hero_products (
  id bigserial primary key,
  product_id text not null references public.products(id) on delete restrict,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id)
);

-- ==========================================
-- 3. TRIGGERS & AUTOMATION
-- ==========================================

-- Function: Auto-create Profile on Sign Up
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

-- Trigger: Link to Auth
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 4. SECURITY (ROW LEVEL SECURITY)
-- ==========================================

-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.discount_codes enable row level security;
alter table public.profiles enable row level security;
alter table public.newsletter_emails enable row level security;
alter table public.contact_messages enable row level security;
alter table public.hero_products enable row level security;

-- [IMPORTANT] Drop existing policies to prevent "policy already exists" errors
drop policy if exists "Public variants are viewable by everyone" on public.product_variants;
drop policy if exists "Admins can manage variants" on public.product_variants;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Public categories are viewable by everyone" on public.categories;
drop policy if exists "Admins can manage categories" on public.categories;
drop policy if exists "Public products are viewable by everyone" on public.products;
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Admins can manage orders" on public.orders;
drop policy if exists "Users can view own order items" on public.order_items;
drop policy if exists "Admins can manage order items" on public.order_items;
drop policy if exists "Public active discounts are viewable" on public.discount_codes;
drop policy if exists "Admins can manage discounts" on public.discount_codes;
drop policy if exists "Anyone can join newsletter" on public.newsletter_emails;
drop policy if exists "Admins can view newsletter" on public.newsletter_emails;
drop policy if exists "Anyone can submit contact" on public.contact_messages;
drop policy if exists "Admins can view contact" on public.contact_messages;
drop policy if exists "Public hero products are viewable" on public.hero_products;
drop policy if exists "Admins can manage hero products" on public.hero_products;

-- Policy: Allow Everyone to View Variants (Shopping)
create policy "Public variants are viewable by everyone"
  on public.product_variants for select
  using (true);

-- Policy: Allow Everyone to View Products (Shopping)
create policy "Public products are viewable by everyone"
  on public.products for select
  using (true);

-- Policy: Allow Everyone to View Categories (Shopping)
create policy "Public categories are viewable by everyone"
  on public.categories for select
  using (true);

-- Policy: Allow Admins to Manage Variants
create policy "Admins can manage variants"
  on public.product_variants
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Allow Admins to Manage Products
create policy "Admins can manage products"
  on public.products
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Allow Admins to Manage Categories
create policy "Admins can manage categories"
  on public.categories
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Policy: Users can view their own orders
create policy "Users can view own orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and lower(profiles.email) = lower(orders.email)
    )
  );

-- Policy: Admins can manage orders
create policy "Admins can manage orders"
  on public.orders
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Users can view their own order items
create policy "Users can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1
      from public.orders
      join public.profiles on lower(profiles.email) = lower(orders.email)
      where orders.id = order_items.order_id
      and profiles.id = auth.uid()
    )
  );

-- Policy: Admins can manage order items
create policy "Admins can manage order items"
  on public.order_items
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Public can view active discount codes
create policy "Public active discounts are viewable"
  on public.discount_codes for select
  using (is_active = true);

-- Policy: Admins can manage discount codes
create policy "Admins can manage discounts"
  on public.discount_codes
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Anyone can join newsletter
create policy "Anyone can join newsletter"
  on public.newsletter_emails for insert
  with check (true);

-- Policy: Admins can view newsletter
create policy "Admins can view newsletter"
  on public.newsletter_emails for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Anyone can submit contact
create policy "Anyone can submit contact"
  on public.contact_messages for insert
  with check (true);

-- Policy: Admins can view contact
create policy "Admins can view contact"
  on public.contact_messages for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Public can view hero products
create policy "Public hero products are viewable"
  on public.hero_products for select
  using (true);

-- Policy: Admins can manage hero products
create policy "Admins can manage hero products"
  on public.hero_products
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- ==========================================
-- 4.1 SAFETY MIGRATIONS (EXISTING DATABASES)
-- ==========================================

alter table public.orders
  add column if not exists awb_number text,
  add column if not exists courier_name text,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric;

alter table public.categories
  add column if not exists featured_product_id text references public.products(id) on delete set null;

alter table public.profiles
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text;

-- Add bestseller column to products (for existing databases)
alter table public.products
  add column if not exists bestseller boolean not null default false;

-- Add SKU column to products (for existing databases)
alter table public.products
  add column if not exists sku text;

-- Generate SKUs for existing products that don't have one
do $$
declare
  product_record record;
  new_sku text;
begin
  for product_record in 
    select id from public.products where sku is null or sku = ''
  loop
    -- Generate 8-digit numeric SKU
    new_sku := lpad(floor(random() * 90000000 + 10000000)::text, 8, '0');
    
    update public.products
    set sku = new_sku
    where id = product_record.id;
  end loop;
end $$;

-- ==========================================
-- 5. DATABASE FUNCTIONS
-- ==========================================

-- Function: Safely Decrement Stock (Prevents race conditions)
create or replace function decrement_variant_stock(p_variant_id bigint, p_quantity int)
returns void as $$
begin
  update public.product_variants
  set stock = stock - p_quantity
  where id = p_variant_id;
end;
$$ language plpgsql security definer;

-- Function: Reserve stock for an order (throws if insufficient)
create or replace function reserve_order_stock(items jsonb)
returns void as $$
declare
  rec record;
begin
  for rec in select * from jsonb_to_recordset(items) as x(product_id text, quantity int)
  loop
    update public.products
    set stock = stock - rec.quantity
    where id = rec.product_id and stock >= rec.quantity;
    if not found then
      raise exception 'Insufficient stock for %', rec.product_id;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Function: Release stock back (used when order creation fails)
create or replace function release_order_stock(items jsonb)
returns void as $$
declare
  rec record;
begin
  for rec in select * from jsonb_to_recordset(items) as x(product_id text, quantity int)
  loop
    update public.products
    set stock = stock + rec.quantity
    where id = rec.product_id;
  end loop;
end;
$$ language plpgsql security definer;

-- ==========================================
-- 6. STORAGE CONFIGURATION (Images)
-- ==========================================

-- Create 'products' bucket for image uploads (if not exists)
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- [IMPORTANT] Drop existing storage policies to prevent duplicates
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Admin Manage" on storage.objects;

-- Policy: Allow Public to SEE images
create policy "Public Access"
  on storage.objects for select
  using (bucket_id = 'products');

-- Policy: Allow Admins to UPLOAD/DELETE images
create policy "Admin Manage"
  on storage.objects for all
  using (
    (bucket_id = 'products'::text)
    and exists (
      select 1
      from public.profiles
      where (profiles.id = auth.uid()) and (profiles.role = 'admin'::text)
    )
  )
  with check (
    (bucket_id = 'products'::text)
    and exists (
      select 1
      from public.profiles
      where (profiles.id = auth.uid()) and (profiles.role = 'admin'::text)
    )
  );

-- ==========================================
-- 7. DATA MIGRATION: UPDATE SKUS TO 10-DIGIT
-- ==========================================

-- Function to regenerate SKUs for all products to catch legacy 8-digit ones
do $$
declare
  r record;
  new_sku text;
begin
  for r in select id from public.products loop
    -- Generate 10-digit numeric SKU
    new_sku := floor(random() * 9000000000 + 1000000000)::text;
    
    update public.products
    set sku = new_sku
    where id = r.id;
  end loop;
end $$;

-- ==========================================
-- 5.1 DATA INTEGRITY CONSTRAINTS & INDEXES
-- ==========================================

alter table public.products drop constraint if exists products_price_non_negative;
alter table public.products
  add constraint products_price_non_negative check (price >= 0) not valid;
alter table public.products validate constraint products_price_non_negative;

alter table public.products drop constraint if exists products_stock_non_negative;
alter table public.products
  add constraint products_stock_non_negative check (stock >= 0) not valid;
alter table public.products validate constraint products_stock_non_negative;

alter table public.order_items drop constraint if exists order_items_quantity_positive;
alter table public.order_items
  add constraint order_items_quantity_positive check (quantity > 0) not valid;
alter table public.order_items validate constraint order_items_quantity_positive;

alter table public.order_items drop constraint if exists order_items_price_non_negative;
alter table public.order_items
  add constraint order_items_price_non_negative check (price >= 0) not valid;
alter table public.order_items validate constraint order_items_price_non_negative;

alter table public.orders drop constraint if exists orders_total_non_negative;
alter table public.orders
  add constraint orders_total_non_negative check (total >= 0) not valid;
alter table public.orders validate constraint orders_total_non_negative;

alter table public.discount_codes drop constraint if exists discount_codes_value_non_negative;
alter table public.discount_codes
  add constraint discount_codes_value_non_negative check (value >= 0) not valid;
alter table public.discount_codes validate constraint discount_codes_value_non_negative;

alter table public.discount_codes drop constraint if exists discount_codes_used_count_non_negative;
alter table public.discount_codes
  add constraint discount_codes_used_count_non_negative check (used_count >= 0) not valid;
alter table public.discount_codes validate constraint discount_codes_used_count_non_negative;

alter table public.orders drop constraint if exists orders_status_allowed;
alter table public.orders
  add constraint orders_status_allowed check (status in ('pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled')) not valid;
alter table public.orders validate constraint orders_status_allowed;

create index if not exists idx_orders_email on public.orders (lower(email));
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_discount_codes_code_lower on public.discount_codes (lower(code));

-- ==========================================
-- 5.2 SHARED RATE LIMIT STORE
-- ==========================================

create table if not exists public.rate_limits (
  identifier text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create or replace function public.check_rate_limit(
  p_identifier text,
  p_limit int,
  p_window_ms int
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limits%rowtype;
  v_reset_at timestamptz;
  v_retry_after int := 0;
begin
  select * into v_row
  from public.rate_limits
  where identifier = p_identifier
  for update;

  if not found or v_now > v_row.reset_at then
    v_reset_at := v_now + make_interval(secs => (p_window_ms / 1000));
    insert into public.rate_limits(identifier, count, reset_at, updated_at)
    values (p_identifier, 1, v_reset_at, v_now)
    on conflict (identifier)
    do update set count = 1, reset_at = excluded.reset_at, updated_at = excluded.updated_at;

    return jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
  end if;

  if v_row.count >= p_limit then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_row.reset_at - v_now)))::int);
    return jsonb_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  update public.rate_limits
  set count = count + 1,
      updated_at = v_now
  where identifier = p_identifier;

  return jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

create or replace function public.create_order_atomic(
  p_order jsonb,
  p_items jsonb,
  p_discount_id text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order_id text;
  v_order_record public.orders%rowtype;
  v_stock_items jsonb;
begin
  v_order_id := p_order->>'id';

  v_stock_items := (
    select jsonb_agg(
      jsonb_build_object(
        'product_id', item->>'product_id',
        'quantity', (item->>'quantity')::int
      )
    )
    from jsonb_array_elements(p_items) item
  );

  perform public.reserve_order_stock(v_stock_items);

  insert into public.orders(
    id, email, address, notes, status, subtotal, shipping_fee,
    discount_code, discount_amount, total, created_at
  )
  values (
    v_order_id,
    p_order->>'email',
    p_order->>'address',
    p_order->>'notes',
    coalesce(p_order->>'status', 'pending'),
    (p_order->>'subtotal')::numeric,
    (p_order->>'shipping_fee')::numeric,
    p_order->>'discount_code',
    nullif(p_order->>'discount_amount', '')::numeric,
    (p_order->>'total')::numeric,
    coalesce((p_order->>'created_at')::timestamptz, now())
  )
  returning * into v_order_record;

  insert into public.order_items(order_id, product_id, quantity, color, size, price)
  select
    v_order_id,
    item->>'product_id',
    (item->>'quantity')::int,
    nullif(item->>'color', ''),
    nullif(item->>'size', ''),
    (item->>'price')::numeric
  from jsonb_array_elements(p_items) item;

  if p_discount_id is not null then
    update public.discount_codes
    set used_count = used_count + 1
    where id = p_discount_id;
  end if;

  return to_jsonb(v_order_record);
exception
  when others then
    if v_stock_items is not null then
      perform public.release_order_stock(v_stock_items);
    end if;
    raise;
end;
$$;

revoke all on function public.create_order_atomic(jsonb, jsonb, text) from public;
grant execute on function public.create_order_atomic(jsonb, jsonb, text) to service_role;
