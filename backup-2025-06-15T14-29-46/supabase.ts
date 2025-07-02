import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';

// Configuration Développement
// Générée automatiquement le 2025-06-15T09:34:56.907Z

console.log('========== CONFIGURATION SUPABASE ==========');
console.log('Environnement:', 'development');
console.log('Base de données:', 'Développement');
console.log('URL:', 'https://whxkhrtlccxubvjgexmi.supabase.co');
console.log('==========================================');

// Configuration explicite pour Développement
const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5OTc0MjEsImV4cCI6MjA2MzU3MzQyMX0.Bw3EecPS7gH61udufLAipWZGDbJzC2sb-D890w_iIds';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

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

console.log('✅ Clients Supabase initialisés pour Développement');
