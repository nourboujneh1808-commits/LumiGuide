// Connexion à Supabase (projet LumiGuide-Nour).
// La clé "publishable" est faite pour le navigateur. Jamais de clé "secret" ou "service_role" ici.
const SUPABASE_URL = "https://zfzmznbdvlzfaunbqcqy.supabase.co";
const SUPABASE_KEY = "sb_publishable_4LnYp5tBUG-aV6zk79BYJQ_CPCbgcHv";

// Une seule initialisation du client pour tout le site
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const SUPABASE_READY = !SUPABASE_URL.includes("VOTRE-PROJET") && !SUPABASE_KEY.includes("VOTRE_CLE");
