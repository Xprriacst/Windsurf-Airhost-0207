import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';

// Configuration dynamique basée sur les variables d'environnement
const isProduction = import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';
const environment = isProduction ? 'production' : 'development';

console.log('========== CONFIGURATION SUPABASE ==========');
console.log('Environnement:', environment);
console.log('Mode Vite:', import.meta.env.MODE);
console.log('Production:', isProduction);
console.log('==========================================');

// Configuration via variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5OTc0MjEsImV4cCI6MjA2MzU3MzQyMX0.Bw3EecPS7gH61udufLAipWZGDbJzC2sb-D890w_iIds';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

// Vérifications de sécurité
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Configuration Supabase invalide!');
  throw new Error('Variables Supabase manquantes');
}

// Logs de validation
console.log('✅ Configuration validée:');
console.log('- URL:', supabaseUrl);
console.log('- Clé publique:', supabaseAnonKey.substring(0, 30) + '...');
console.log('- Clé service:', supabaseServiceRoleKey ? 'Présente' : 'Manquante');
console.log('- Site URL:', getSiteUrl());

// Création des clients Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

console.log(`✅ Clients Supabase initialisés pour ${environment}`);
