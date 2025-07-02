#!/usr/bin/env node

// Test de connexion et application du correctif staging

import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4MzY0NSwiZXhwIjoyMDU1MzU5NjQ1fQ.nbhxWUoyYT5a8XxpC2la9sMYMKDJL95YQ9hhFvy5tos';

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

async function addHostIdColumn() {
  console.log('🔧 Application du correctif host_id sur staging...\n');

  try {
    // 1. Vérifier si la colonne existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('conversations')
      .select('host_id')
      .limit(1);

    if (!checkError) {
      console.log('✅ La colonne host_id existe déjà');
      return true;
    }

    // 2. Ajouter la colonne host_id via RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE conversations 
        ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES hosts(id);
        
        CREATE INDEX IF NOT EXISTS idx_conversations_host_id ON conversations(host_id);
      `
    });

    if (error) {
      console.log('❌ Erreur lors de l\'ajout de la colonne:', error.message);
      return false;
    }

    console.log('✅ Colonne host_id ajoutée avec succès');
    return true;

  } catch (err) {
    console.log('❌ Erreur:', err.message);
    return false;
  }
}

async function verifyStaging() {
  console.log('🔍 Vérification finale de staging...\n');

  try {
    // Test host_id
    const { data: convTest, error: convError } = await supabase
      .from('conversations')
      .select('id, host_id')
      .limit(1);

    if (convError) {
      console.log('❌ Problème avec conversations:', convError.message);
      return false;
    }

    console.log('✅ Table conversations accessible avec host_id');

    // Test conversation_analysis
    const { data: analysisTest, error: analysisError } = await supabase
      .from('conversation_analysis')
      .select('*', { count: 'exact', head: true });

    if (analysisError) {
      console.log('❌ Problème avec conversation_analysis:', analysisError.message);
      return false;
    }

    console.log('✅ Table conversation_analysis accessible');
    console.log(`   Nombre d'analyses: ${analysisTest?.length || 0}`);

    return true;

  } catch (err) {
    console.log('❌ Erreur de vérification:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Configuration automatique du staging\n');

  // Étape 1: Corriger la colonne host_id
  const hostIdFixed = await addHostIdColumn();
  
  if (!hostIdFixed) {
    console.log('\n❌ Échec de la correction host_id');
    console.log('Solution manuelle:');
    console.log('1. Aller sur https://tornfqtvnzkgnwfudxdb.supabase.co');
    console.log('2. Éditeur SQL → Exécuter:');
    console.log('   ALTER TABLE conversations ADD COLUMN host_id UUID;');
    return;
  }

  // Étape 2: Vérifier que tout fonctionne
  const isReady = await verifyStaging();
  
  if (isReady) {
    console.log('\n🎉 Staging configuré avec succès!');
    console.log('Prêt pour les tests avec les tags d\'urgence');
  } else {
    console.log('\n⚠️  Configuration partiellement réussie');
    console.log('Vérifiez manuellement dans l\'interface Supabase');
  }
}

main();