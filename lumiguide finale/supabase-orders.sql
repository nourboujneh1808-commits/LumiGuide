-- =====================================================================
-- supabase-orders.sql  (ETAPE 2 sur 3)
-- A executer apres supabase-setup.sql. Relancable sans supprimer les commandes.
-- Regles de livraison (a garder identiques a SHIP_FEE / FREE_FROM dans script.js) :
-- 7 TND (7000 millimes), offerte des 50 TND (50000 millimes).
-- =====================================================================

create sequence if not exists public.order_ref_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('LG-' || lpad(nextval('public.order_ref_seq')::text, 6, '0')),
  user_id uuid not null references auth.users(id) on delete restrict,
  attempt_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  items jsonb not null,
  shipping jsonb not null,
  payment_method text not null check (payment_method in ('livraison','carte_simulee')),
  subtotal_millimes bigint not null check (subtotal_millimes >= 0),
  shipping_millimes bigint not null check (shipping_millimes >= 0),
  total_millimes bigint not null check (total_millimes >= 0),
  status text not null default 'nouvelle' check (status in ('nouvelle','en_preparation','terminee','annulee')),
  unique (user_id, attempt_id)
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- updated_at mis a jour automatiquement
create or replace function public.orders_touch()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end; $$;
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.orders_touch();

-- Droits + RLS : lecture seulement (les ecritures passent par les fonctions ci-dessous)
revoke all on table public.orders from anon, authenticated;
grant select on public.orders to authenticated;
alter table public.orders enable row level security;
drop policy if exists "orders_read_own_or_admin" on public.orders;
create policy "orders_read_own_or_admin" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Creation d'une commande de demonstration (montants calcules par la base)
create or replace function public.create_demo_order(
  p_attempt_id uuid, p_items jsonb, p_shipping jsonb, p_payment text, p_expected_total bigint)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
  v_item jsonb; v_prod public.products;
  v_qty int; v_col text; v_sub bigint := 0; v_fee bigint; v_lines jsonb := '[]'::jsonb;
  v_ship jsonb; v_email text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_attempt_id is null then raise exception 'INVALID_ATTEMPT'; end if;

  -- meme tentative deja enregistree : on renvoie la commande existante (pas de doublon)
  select * into v_order from public.orders where user_id = v_uid and attempt_id = p_attempt_id;
  if found then return v_order; end if;

  if p_payment is null or p_payment not in ('livraison','carte_simulee') then raise exception 'INVALID_PAYMENT'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'EMPTY_CART'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item->'q') <> 'number' or (v_item->>'q') !~ '^[0-9]+$' then raise exception 'INVALID_ITEM'; end if;
    v_qty := (v_item->>'q')::int;
    if v_qty < 1 or v_qty > 20 then raise exception 'INVALID_ITEM'; end if;
    select * into v_prod from public.products where id = (v_item->>'id') and available = true;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    v_col := coalesce(v_item->>'col', '');
    if v_col not in ('', 'Rose Quartz', 'Champagne', 'Midnight', 'Lilac') then v_col := ''; end if;
    v_sub := v_sub + v_prod.price_millimes * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id', v_prod.id, 'name', v_prod.name, 'color', v_col, 'qty', v_qty,
      'unit_millimes', v_prod.price_millimes, 'line_millimes', v_prod.price_millimes * v_qty));
  end loop;

  -- coordonnees de livraison (seulement les champs attendus)
  if jsonb_typeof(p_shipping) <> 'object'
     or length(btrim(coalesce(p_shipping->>'name',''))) < 2
     or length(btrim(coalesce(p_shipping->>'phone',''))) < 8
     or length(btrim(coalesce(p_shipping->>'address',''))) < 5
     or length(btrim(coalesce(p_shipping->>'city',''))) < 2 then
    raise exception 'INVALID_SHIPPING';
  end if;
  select email into v_email from auth.users where id = v_uid;
  v_ship := jsonb_build_object(
    'name', left(btrim(p_shipping->>'name'), 100), 'phone', left(btrim(p_shipping->>'phone'), 30),
    'address', left(btrim(p_shipping->>'address'), 200), 'city', left(btrim(p_shipping->>'city'), 80),
    'email', v_email);

  v_fee := case when v_sub >= 50000 then 0 else 7000 end;
  if p_expected_total is distinct from (v_sub + v_fee) then raise exception 'PRICE_CHANGED'; end if;

  begin
    insert into public.orders (user_id, attempt_id, items, shipping, payment_method,
                               subtotal_millimes, shipping_millimes, total_millimes)
    values (v_uid, p_attempt_id, v_lines, v_ship, p_payment, v_sub, v_fee, v_sub + v_fee)
    returning * into v_order;
  exception when unique_violation then
    select * into v_order from public.orders where user_id = v_uid and attempt_id = p_attempt_id;
  end;
  return v_order;
end;
$$;
revoke all on function public.create_demo_order(uuid, jsonb, jsonb, text, bigint) from public, anon;
grant execute on function public.create_demo_order(uuid, jsonb, jsonb, text, bigint) to authenticated;

-- Changement de statut (admin seulement) avec detection des modifications concurrentes
create or replace function public.admin_set_order_status(
  p_order_id uuid, p_status text, p_expected_updated_at timestamptz)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare v_order public.orders;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('nouvelle','en_preparation','terminee','annulee') then raise exception 'INVALID_STATUS'; end if;
  update public.orders set status = p_status
   where id = p_order_id and updated_at = p_expected_updated_at
  returning * into v_order;
  if not found then raise exception 'CONFLICT'; end if;
  return v_order;
end;
$$;
revoke all on function public.admin_set_order_status(uuid, text, timestamptz) from public, anon;
grant execute on function public.admin_set_order_status(uuid, text, timestamptz) to authenticated;
