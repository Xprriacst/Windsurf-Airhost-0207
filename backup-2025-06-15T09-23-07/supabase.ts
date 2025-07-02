import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';

// Logs détaillés pour le débogage
console.log('========== DÉBOGAGE SUPABASE CONFIGURATION ==========');

// Vérifier toutes les variables d'environnement disponibles
console.log('Variables d\'environnement disponibles:');
console.log('VITE_SUPABASE_URL (brut):', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_URL (type):', typeof import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY (présent):', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Oui' : 'Non');
console.log('VITE_SITE_URL (brut):', import.meta.env.VITE_SITE_URL);
console.log('Environnement MODE:', import.meta.env.MODE);
console.log('Est en PROD:', import.meta.env.PROD ? 'Oui' : 'Non');

// Afficher toutes les variables d'environnement disponibles
console.log('Toutes les variables d\'environnement:');
console.log(import.meta.env);

// Configuration PRODUCTION explicite - utiliser directement les variables PROD
const supabaseUrl = import.meta.env.VITE_PROD_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PROD_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables d\'environnement Supabase manquantes !');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Définie' : 'Manquante');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Définie' : 'Manquante');
}

// Logs pour comprendre la source de l'URL
console.log('Source de l\'URL Supabase:');
console.log('- Mode d\'environnement:', import.meta.env.DEV ? 'Développement' : 'Production');
console.log('- URL finale utilisée:', supabaseUrl);

// Vérifier que les valeurs sont correctes
console.log('Valeurs finales utilisées:');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Définie' : 'Non définie');
console.log('Environnement:', import.meta.env.MODE);
console.log('URL du site:', getSiteUrl());
console.log('========== FIN DÉBOGAGE SUPABASE ==========');

// Créer le client Supabase avec configuration minimale pour test
console.log('Création du client Supabase avec URL:', supabaseUrl);
console.log('Clé API (premiers caractères):', supabaseAnonKey.substring(0, 30) + '...');

// Test avec configuration absolument minimale
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin avec service role key pour les opérations privilégiées
const supabaseServiceRoleKey = import.meta.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

console.log('Clients Supabase créés:');
console.log('- Client public:', !!supabase);
console.log('- Client admin:', !!supabaseAdmin);
console.log('- Service role key présente:', !!supabaseServiceRoleKey);
