import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';

// Configuration Production (Airhost-REC)
// Générée automatiquement le 2025-06-15T09:33:47.012Z

console.log('========== CONFIGURATION SUPABASE ==========');
console.log('Environnement:', 'production');
console.log('Base de données:', 'Production (Airhost-REC)');
console.log('URL:', 'https://pnbfsiicxhckptlgtjoj.supabase.co');
console.log('==========================================');

// Configuration explicite pour Production (Airhost-REC)
const supabaseUrl = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjU1MDIsImV4cCI6MjA2MzI0MTUwMn0.vMGfxAJyurk-UJ7XUWPhOmjmJ2wiYfxdpLTe-wfExpk';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2NTUwMiwiZXhwIjoyMDYzMjQxNTAyfQ.DPKTpahAzRv1X3crxS81XhmLSzbW8fUbAQ22Ru0GFdc';

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

console.log('✅ Clients Supabase initialisés pour Production (Airhost-REC)');
