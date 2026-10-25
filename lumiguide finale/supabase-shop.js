// Toutes les fonctions qui parlent à Supabase : compte, catalogue, commandes, admin.
const LG = (() => {
  const SHIP_FEE_M = 7000, FREE_FROM_M = 50000; // millimes, identiques à supabase-orders.sql
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tnd = m => (m / 1000).toFixed(3).replace(".", ",") + " TND";
  const dateFr = d => new Date(d).toLocaleString("fr-TN", { dateStyle: "short", timeStyle: "short" });
  const STATUTS = { nouvelle: "Nouvelle", en_preparation: "En préparation", terminee: "Terminée", annulee: "Annulée" };

  // Messages compréhensibles pour les erreurs
  function msg(e) {
    const t = (e && (e.message || e.error_description)) || String(e || "");
    const map = [
      ["AUTH_REQUIRED", "Connectez-vous pour commander."], ["EMPTY_CART", "Votre panier est vide."],
      ["PRODUCT_UNAVAILABLE", "Un produit du panier n'est plus disponible. Retirez-le puis réessayez."],
      ["INVALID_ITEM", "Une quantité du panier n'est pas valide."], ["INVALID_SHIPPING", "Vérifiez vos coordonnées de livraison."],
      ["INVALID_PAYMENT", "Moyen de paiement non valide."], ["PRICE_CHANGED", "Les prix ont changé. Vérifiez le nouveau total puis validez à nouveau."],
      ["CONFLICT", "Cette commande a été modifiée par quelqu'un d'autre. Actualisez la liste."], ["FORBIDDEN", "Action réservée à l'administrateur."],
      ["Invalid login credentials", "E-mail ou mot de passe incorrect."], ["Email not confirmed", "Confirmez d'abord votre adresse e-mail (lien reçu par e-mail)."],
      ["User already registered", "Un compte existe déjà avec cet e-mail."], ["Password should be at least", "Le mot de passe est trop court (6 caractères minimum)."],
      ["rate limit", "Trop de tentatives. Patientez quelques minutes."], ["Failed to fetch", "Problème de connexion internet. Réessayez."],
      ["duplicate key", "Cet identifiant existe déjà."], ["violates check constraint", "Une valeur n'est pas valide (vérifiez catégorie, prix, image)."],
      ["row-level security", "Action non autorisée avec votre compte."]
    ];
    const f = map.find(([k]) => t.includes(k));
    return f ? f[1] : "Une erreur est survenue. Réessayez.";
  }
  const need = () => { if (!SUPABASE_READY) throw new Error("Supabase n'est pas encore configuré (voir SUPABASE.md, étape 3)."); };
  const page = n => new URL(n, location.href).href; // fonctionne en localhost et sur Vercel

  // --- Session et rôle
  let _user, _admin;
  async function user() { if (_user !== undefined) return _user; if (!SUPABASE_READY) return (_user = null); const { data } = await sb.auth.getUser().catch(() => ({ data: null })); return (_user = data?.user || null); }
  async function isAdmin() {
    if (_admin !== undefined) return _admin; const u = await user(); if (!u) return (_admin = false);
    const { data } = await sb.from("user_roles").select("role").eq("user_id", u.id).maybeSingle();
    return (_admin = data?.role === "admin");
  }
  async function signUp(first, last, email, password, next) {
    need();
    const redirect = page("login.html") + (next ? "?next=" + encodeURIComponent(next) : "");
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect, data: { first_name: first, last_name: last } } });
    if (error) throw error; return data;
  }
  async function signIn(email, password) { need(); const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; _user = undefined; _admin = undefined; return data; }
  async function signOut() { if (SUPABASE_READY) await sb.auth.signOut(); _user = null; _admin = false; }
  async function requireLogin() { const u = await user(); if (!u) { location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() || "index.html"); return null; } return u; }

  // --- Catalogue : met à jour les prix/noms de D.P (script.js) avec ceux de la base
  async function loadCatalog() {
    if (!SUPABASE_READY) return null;
    const { data, error } = await sb.from("products").select("*").eq("available", true).order("created_at");
    if (error) return null;
    const ids = new Set(data.map(p => p.id));
    data.forEach(p => { D.P[p.id] = Object.assign(D.P[p.id] || {}, { name: p.name, price: p.price_millimes / 1000, image: p.image, db: true }); });
    Object.keys(D.P).forEach(k => { if (!ids.has(k)) D.P[k].gone = true; else delete D.P[k].gone; });
    return data;
  }

  // --- Commandes
  async function createOrder(attemptId, items, shipping, payment, expectedMillimes) {
    need();
    const { data, error } = await sb.rpc("create_demo_order", { p_attempt_id: attemptId, p_items: items, p_shipping: shipping, p_payment: payment, p_expected_total: expectedMillimes });
    if (error) throw error; return data;
  }
  async function myOrders() { const { data, error } = await sb.from("orders").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data; }
  async function orderByRef(ref) { const { data, error } = await sb.from("orders").select("*").eq("ref", ref).maybeSingle(); if (error) throw error; return data; }
  function orderHtml(o) {
    const lines = o.items.map(i => `<li>${esc(i.name)}${i.color ? " (" + esc(i.color) + ")" : ""} × ${i.qty} — ${tnd(i.line_millimes)}</li>`).join("");
    const s = o.shipping || {};
    return `<ul>${lines}</ul><p>Sous-total : ${tnd(o.subtotal_millimes)} · Livraison : ${o.shipping_millimes ? tnd(o.shipping_millimes) : "Offerte"} · <b>Total : ${tnd(o.total_millimes)}</b></p>
      <p>Livraison : ${esc(s.name)}, ${esc(s.address)}, ${esc(s.city)} · Tél. ${esc(s.phone)}${s.email ? " · " + esc(s.email) : ""}</p>
      <p>Paiement simulé : ${o.payment_method === "livraison" ? "à la livraison" : "carte (simulation, aucun débit)"}</p>`;
  }

  // --- Admin
  async function adminOrders(status, from, count = 50) {
    let q = sb.from("orders").select("*").order("created_at", { ascending: false }).range(from, from + count - 1);
    if (status) q = q.eq("status", status);
    const { data, error } = await q; if (error) throw error; return data;
  }
  async function adminSetStatus(id, status, expectedUpdatedAt) { const { data, error } = await sb.rpc("admin_set_order_status", { p_order_id: id, p_status: status, p_expected_updated_at: expectedUpdatedAt }); if (error) throw error; return data; }
  async function adminProducts() { const { data, error } = await sb.from("products").select("*").order("created_at"); if (error) throw error; return data; }
  async function adminSaveProduct(p, isNew) {
    const r = isNew ? await sb.from("products").insert(p) : await sb.from("products").update(p).eq("id", p.id);
    if (r.error) throw r.error;
  }
  async function adminDeleteProduct(id) { const { error } = await sb.from("products").delete().eq("id", id); if (error) throw error; }

  // --- Menu : ajoute Connexion / Mon compte / Admin sur toutes les pages
  async function navInit() {
    const nav = document.getElementById("nav"); if (!nav) return;
    const u = await user(), adm = u ? await isAdmin() : false;
    const here = location.pathname.split("/").pop();
    const add = (h, t) => { const a = document.createElement("a"); a.href = h; a.textContent = t; if (here === h) { a.className = "on"; a.setAttribute("aria-current", "page"); } nav.appendChild(a); };
    if (adm) add("admin.html", "Admin");
    u ? add("compte.html", "Mon compte") : add("login.html", "Connexion");
  }
  document.addEventListener("DOMContentLoaded", navInit);

  return { esc, tnd, dateFr, STATUTS, msg, user, isAdmin, signUp, signIn, signOut, requireLogin, loadCatalog, createOrder, myOrders, orderByRef, orderHtml, adminOrders, adminSetStatus, adminProducts, adminSaveProduct, adminDeleteProduct, SHIP_FEE_M, FREE_FROM_M };
})();
