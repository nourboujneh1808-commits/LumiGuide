-- =====================================================================
-- supabase-admin.sql  (ETAPE 3 sur 3)
-- A executer APRES avoir cree ET confirme votre compte sur le site.
-- 1) Supabase > Authentication > Users : copiez l'UUID de votre compte.
-- 2) Remplacez VOTRE-UUID ci-dessous (en gardant les guillemets simples).
-- 3) Executez dans SQL Editor. Cette operation ne se fait JAMAIS depuis le navigateur.
-- =====================================================================
insert into public.user_roles (user_id, role)
values ('VOTRE-UUID', 'admin')
on conflict (user_id) do update set role = 'admin';
