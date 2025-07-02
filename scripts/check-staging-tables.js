#!/usr/bin/env node

// Script pour vérifier la structure de l'instance staging
// et identifier les éléments manquants

import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4MzY0NSwiZXhwIjoyMDU1MzU5NjQ1fQ.nbhxWUoyYT5a8XxpC2la9sMYMKDJL95YQ9hhFvy5tos';

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

async function checkStagingStructure() {
  console.log('🔍 Vérification de la structure staging...\n');

  try {
    // 1. Vérifier les tables principales
    console.log('📋 Vérification des tables principales:');
    
    const tablesToCheck = ['conversations', 'messages', 'conversation_analysis', 'properties', 'hosts'];
    const existingTables = [];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          existingTables.push(tableName);
          console.log(`  ✅ ${tableName} - existe`);
        } else {
          console.log(`  ❌ ${tableName} - ${error.message}`);
        }
      } catch (err) {
        console.log(`  ❌ ${tableName} - Erreur: ${err.message}`);
      }
    }

    // 2. Tester la colonne host_id spécifiquement
    console.log('\n🔍 Test de la colonne host_id:');
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('host_id')
        .limit(1);
      
      if (!error) {
        console.log('  ✅ Colonne host_id existe');
      } else {
        console.log(`  ❌ Colonne host_id manquante: ${error.message}`);
      }
    } catch (err) {
      console.log(`  ❌ Erreur test host_id: ${err.message}`);
    }

    // 3. Recommandations
    console.log('\n📝 Actions nécessaires:');
    
    if (!existingTables.includes('conversations')) {
      console.log('❌ Table conversations manquante');
    } else {
      console.log('✅ Table conversations présente');
    }

    if (!existingTables.includes('conversation_analysis')) {
      console.log('❌ Table conversation_analysis manquante - nécessaire pour les tags');
    } else {
      console.log('✅ Table conversation_analysis présente');
    }

    console.log('\n🚀 Migration recommandée:');
    console.log('1. Exécuter ALTER TABLE pour ajouter host_id');
    console.log('2. Créer conversation_analysis si manquante');
    console.log('3. Synchroniser la structure avec production');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

checkStagingStructure();