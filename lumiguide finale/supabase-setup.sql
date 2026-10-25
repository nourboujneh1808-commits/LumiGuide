-- =====================================================================
-- supabase-setup.sql  (ETAPE 1 sur 3)
-- RESERVE A UNE BASE NEUVE : ne le relancez pas sur une base qui contient deja
-- des tables products / user_roles (cela provoquerait une erreur).
-- A executer dans Supabase > SQL Editor > New query > Run.
-- Les prix sont stockes en millimes (1 TND = 1000 millimes) : 299000 = 299,000 TND.
-- =====================================================================

-- 1) Catalogue
create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null check (length(name) between 2 and 120),
  category text not null check (category in ('Appareils','Packs','Soins','Accessoires')),
  description text not null default '',
  price_millimes bigint not null check (price_millimes > 0),
  image text not null check (image ~ '^(https://|images/)'),
  features text[] not null default '{}',
  available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Roles (l'absence de ligne = compte client)
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- 3) Fonction qui dit si l'utilisateur connecte est admin
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 4) Droits SQL (on retire tout, puis on donne le minimum)
revoke all on table public.products, public.user_roles from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;  -- limite par RLS : admin seulement
grant select on public.user_roles to authenticated;                -- aucune ecriture depuis le navigateur

-- 5) RLS
alter table public.products enable row level security;
alter table public.user_roles enable row level security;

create policy "products_public_read" on public.products
  for select to anon, authenticated using (available = true);
create policy "products_admin_read" on public.products
  for select to authenticated using (public.is_admin());
create policy "products_admin_insert" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "products_admin_update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products_admin_delete" on public.products
  for delete to authenticated using (public.is_admin());

create policy "roles_read_own" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));

-- 6) Donnees initiales (catalogue LumiGuide)
insert into public.products (id, name, category, description, price_millimes, image, features, available) values
('pro', 'LumiGuide Pro', 'Appareils', 'Analyse de peau, routine personnalisée et maquillage guidé par application mobile.', 299000, 'images/p-pro.jpg', array['Analyse de peau : hydratation, sébum, pores, taches, rougeurs','Guides maquillage en réalité augmentée','Routine personnalisée dans l''application mobile','Suivi de l''évolution de votre peau','Recharge USB-C, design léger et ergonomique','Garantie 2 ans']::text[], true),
('premium', 'Pack Premium', 'Packs', 'LumiGuide Pro, 5 cartouches de soin et 3 looks offerts.', 398000, 'images/p-premium.jpg', array['LumiGuide Pro','5 cartouches de soin','3 looks offerts']::text[], true),
('prestige', 'Pack Prestige', 'Packs', 'LumiGuide Pro, 10 cartouches de soin et 3 mois d''abonnement looks.', 598000, 'images/p-prestige.jpg', array['LumiGuide Pro','10 cartouches de soin','Abonnement looks de 3 mois']::text[], true),
('soins', 'Coffret de soins', 'Soins', 'Nettoyant, sérum, crème et SPF 50 pour votre routine.', 49000, 'images/p-soins.jpg', array['Nettoyant','Sérum','Crème','SPF 50']::text[], true),
('kit', 'Kit Voyage', 'Accessoires', 'Étui de voyage, câble USB-C et support magnétique.', 59000, 'images/p-kit.jpg', array['Étui de voyage','Câble USB-C','Support magnétique']::text[], true),
('cartouches', 'Cartouches de soin', 'Soins', '5 formules ciblées pour une peau plus saine et lumineuse.', 29000, 'images/p-cartouches.jpg', array['5 formules ciblées : Hydratation, Éclat, Anti-âge, Apaisant, SPF','Pour une peau plus saine et lumineuse']::text[], true),
('cable', 'Câble de recharge USB-C', 'Accessoires', 'Recharge simple pour votre appareil.', 25000, 'images/p-cable.jpg', array['Connecteur USB-C','Recharge simple de votre appareil']::text[], true),
('etui', 'Étui Premium', 'Accessoires', 'Protège votre appareil et vos cartouches, avec un design élégant et compact.', 69000, 'images/p-etui.jpg', array['Protège l''appareil et les cartouches','Design élégant et compact']::text[], true);
