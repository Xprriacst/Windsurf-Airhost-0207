import { createClient } from '@supabase/supabase-js';

// Utiliser les variables d'environnement actuelles (détectées automatiquement)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('[SUPABASE ADMIN] Configuration:');
console.log('- URL:', supabaseUrl);
console.log('- Service key présente:', !!supabaseServiceKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});