# LumiGuide : connecter le site à Supabase et le publier sur Vercel

Le site reste en HTML/CSS/JavaScript, sans compilation. Supabase gère les comptes et la base de données ; Vercel héberge le site. Le paiement est une simulation (aucune donnée bancaire).

## 1. Créer le projet Supabase
1. Ouvrez supabase.com et connectez-vous.
2. **New project** → nom `lumiguide` → choisissez un mot de passe de base et notez-le en lieu privé (jamais dans le code).
3. Choisissez la région proposée → créez le projet et attendez qu'il soit prêt.

## 2. Copier l'URL et la clé publique
1. Cliquez sur **Connect**.
2. Copiez **Project URL** (`https://xxxx.supabase.co`) et la **Publishable key** (`sb_publishable_…`). Autre chemin : Settings → API Keys.
3. Collez-les dans `supabase-client.js`.
4. Ne copiez jamais une clé `secret` ou `service_role`.

## 3. Exécuter les scripts SQL (dans l'ordre)
Dans Supabase → **SQL Editor** → New query :
1. `supabase-setup.sql` (base neuve uniquement : tables, droits, RLS, catalogue).
2. `supabase-orders.sql` (commandes et fonctions ; relançable).
3. Table Editor : vérifiez `products`, `user_roles`, `orders` avec RLS activé.
`supabase-admin.sql` se lance plus tard (étape 5). Ne désactivez jamais RLS.

## 4. Configurer l'authentification
1. **Authentication → URL Configuration**.
2. Ajoutez `http://localhost:8000` dans **Redirect URLs** (et `http://localhost:8000/**` si besoin).
3. Après le déploiement : ajoutez `https://VOTRE-SITE.vercel.app` dans Redirect URLs et mettez-le en **Site URL**.

## 5. Créer un compte, confirmer l'e-mail, devenir admin
1. Lancez le site en local (`python -m http.server 8000` dans le dossier) et ouvrez `http://localhost:8000/signup.html`.
2. Créez un compte avec un e-mail que vous pouvez lire ; cliquez sur le lien reçu (vérifiez les indésirables).
3. Connectez-vous sur `login.html` : `compte.html` affiche votre identité.
4. **Authentication → Users** : copiez l'UUID de votre compte.
5. Dans `supabase-admin.sql`, remplacez `VOTRE-UUID`, puis exécutez le script dans SQL Editor.
6. Déconnectez-vous puis reconnectez-vous : le lien **Admin** apparaît.

## 6. Tester
| Profil | À vérifier |
|---|---|
| Visiteur | Voit les produits ; doit se connecter pour commander ; ne voit aucune commande. |
| Client A | Commande ; retrouve la commande dans Mon compte ; le panier se vide seulement après succès ; la page Admin est refusée. |
| Client B (autre e-mail) | Ne voit jamais les commandes de A. |
| Admin | Ajoute/modifie/supprime un produit ; voit toutes les commandes ; change un statut. |
Testez avec de vraies sessions (pas seulement SQL Editor, qui contourne RLS). Cas d'erreur : coupure réseau pendant la commande (pas de doublon), formulaire invalide, panier vide.

## 7. Publier sur Vercel
1. Poussez le dossier sur un dépôt GitHub personnel.
2. Vercel → **Add New → Project** → importez le dépôt.
3. **Root Directory** : le dossier contenant `index.html`.
4. **Preset : Other**, Build Command vide.
5. **Deploy** et notez l'adresse `https://….vercel.app`.
6. Ajoutez cette adresse dans Supabase (étape 4) puis refaites les tests de l'étape 6.
7. Si votre adresse n'est pas `lumiguide.vercel.app`, remplacez-la dans `sitemap.xml`, `robots.txt` et les balises `canonical` / `og:image` des pages.

## Erreurs fréquentes
| Symptôme | Piste |
|---|---|
| `supabase is not defined` | La bibliothèque Supabase n'est pas chargée avant `supabase-client.js`, ou pas d'internet. |
| « Supabase n'est pas encore configuré » | URL/clé non remplacées dans `supabase-client.js`. |
| Catalogue vide | `supabase-setup.sql` non exécuté, produits non visibles ou RLS manquant (le site garde alors les cartes statiques). |
| E-mail de confirmation absent | Indésirables, adresse saisie, patienter (limites d'envoi du service de test). |
| Lien de confirmation vers une mauvaise adresse | Corriger Site URL et Redirect URLs. |
| Lien Admin absent | UUID incorrect, script non exécuté, ou reconnexion nécessaire. |
| Erreur de commande | Non connecté, `supabase-orders.sql` non exécuté, produit indisponible. |
| Page blanche sur Vercel | Mauvais Root Directory : `index.html` doit être à la racine. |

## Limites de cette version
- Le paiement est simulé. La récupération de mot de passe n'est pas implémentée.
- Les anciennes données locales (comptes, commandes) ne sont pas importées.
- Mon compte affiche les 100 dernières commandes.
- Les pages produit (`produit-*.html`) restent statiques ; la boutique, le panier et la commande lisent les prix dans la base.
- Livraison : 7 TND, offerte dès 50 TND (identique dans `script.js` et `supabase-orders.sql`).
