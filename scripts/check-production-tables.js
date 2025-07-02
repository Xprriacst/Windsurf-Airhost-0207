#!/usr/bin/env node

// Script pour vérifier la structure de l'instance de production
// et identifier les éléments manquants pour la détection d'urgence

import { createClient } from '@supabase/supabase-js';

const PRODUCTION_URL = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const PRODUCTION_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2NTUwMiwiZXhwIjoyMDYzMjQxNTAyfQ.DPKTpahAzRv1X3crxS81XhmLSzbW8fUbAQ22Ru0GFdc';

const supabase = createClient(PRODUCTION_URL, PRODUCTION_SERVICE_KEY);

async function checkProductionStructure() {
  console.log('🔍 Vérification de la structure de production...\n');

  try {
    // 1. Vérifier les tables principales directement
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
          console.log(`  ✅ ${tableName} - ${data?.length || 0} lignes`);
        } else {
          console.log(`  ❌ ${tableName} - ${error.message}`);
        }
      } catch (err) {
        console.log(`  ❌ ${tableName} - Erreur: ${err.message}`);
      }
    }

    // 2. Vérifier spécifiquement conversation_analysis
    console.log('\n🔍 Analyse détaillée de conversation_analysis:');
    const hasAnalysisTable = existingTables.includes('conversation_analysis');
    
    if (hasAnalysisTable) {
      const { data: analyses, count } = await supabase
        .from('conversation_analysis')
        .select('tag', { count: 'exact' })
        .limit(10);

      console.log(`  Nombre total d'analyses: ${count || 0}`);

      if (count > 0) {
        const uniqueTags = [...new Set(analyses?.map(a => a.tag) || [])];
        console.log('  Tags utilisés:', uniqueTags);
      }
    }

    // 3. Vérifier les données de conversations
    console.log('\n💬 Données de conversations:');
    if (existingTables.includes('conversations')) {
      const { data: conversations, count } = await supabase
        .from('conversations')
        .select('id, guest_name, status', { count: 'exact' })
        .limit(5);

      console.log(`  Total: ${count || 0} conversations`);
      conversations?.forEach(conv => 
        console.log(`    - ${conv.guest_name} (${conv.status})`)
      );
    }

    // 4. Recommandations
    console.log('\n📝 Recommandations:');
    
    if (!hasAnalysisTable) {
      console.log('❌ Table conversation_analysis manquante - nécessaire pour les tags d\'urgence');
      console.log('   → Exécuter: scripts/migrate-production-to-staging.sql');
    }

    const requiredTables = ['conversations', 'messages', 'properties', 'hosts'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`❌ Tables manquantes: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ Toutes les tables requises sont présentes');
    }

    console.log('\n📋 Prochaines étapes:');
    console.log('1. Créer l\'instance Supabase staging');
    console.log('2. Exécuter scripts/migrate-production-to-staging.sql sur les deux instances');
    console.log('3. Configurer les variables d\'environnement staging');
    
    console.log('\n✅ Vérification terminée');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

// Exécuter la vérification
checkProductionStructure();