#!/usr/bin/env node

// Validation automatique de la correction staging
// Teste la colonne host_id et la fonctionnalité complète

import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4MzY0NSwiZXhwIjoyMDU1MzU5NjQ1fQ.nbhxWUoyYT5a8XxpC2la9sMYMKDJL95YQ9hhFvy5tos';

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

async function validateStagingFix() {
  console.log('🔍 Validation de la correction staging\n');

  const results = {
    hostIdColumn: false,
    conversationAnalysis: false,
    dataIntegrity: false,
    readyForTesting: false
  };

  try {
    // Test 1: Vérifier la colonne host_id
    console.log('1. Test colonne host_id...');
    const { data: hostIdTest, error: hostIdError } = await supabase
      .from('conversations')
      .select('id, host_id, guest_name')
      .limit(1);

    if (!hostIdError) {
      console.log('   ✅ Colonne host_id accessible');
      results.hostIdColumn = true;
    } else {
      console.log(`   ❌ Erreur host_id: ${hostIdError.message}`);
    }

    // Test 2: Vérifier conversation_analysis
    console.log('2. Test table conversation_analysis...');
    const { data: analysisTest, error: analysisError } = await supabase
      .from('conversation_analysis')
      .select('*', { count: 'exact', head: true });

    if (!analysisError) {
      console.log('   ✅ Table conversation_analysis accessible');
      results.conversationAnalysis = true;
    } else {
      console.log(`   ❌ Erreur conversation_analysis: ${analysisError.message}`);
    }

    // Test 3: Vérifier l'intégrité des données
    console.log('3. Test intégrité des données...');
    const { data: integrityTest, error: integrityError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        host_id,
        hosts!inner(id)
      `)
      .limit(3);

    if (!integrityError) {
      console.log('   ✅ Relations entre tables fonctionnelles');
      results.dataIntegrity = true;
      
      if (integrityTest?.length > 0) {
        console.log(`   📊 ${integrityTest.length} conversations avec hosts associés`);
      }
    } else {
      console.log(`   ❌ Erreur intégrité: ${integrityError.message}`);
    }

    // Test 4: Test d'analyse d'urgence simulée
    console.log('4. Test simulation analyse urgence...');
    try {
      // Obtenir une conversation existante
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);

      if (convData && convData.length > 0) {
        const { data: simulationTest, error: simulationError } = await supabase
          .from('conversation_analysis')
          .insert({
            conversation_id: convData[0].id,
            analysis_type: 'emergency',
            tag: 'Test staging',
            confidence: 0.95,
            explanation: 'Test automatique de la configuration staging',
            needs_attention: true
          })
          .select();

        if (!simulationError && simulationTest) {
          console.log('   ✅ Insertion analyse test réussie');
          
          // Nettoyer le test
          await supabase
            .from('conversation_analysis')
            .delete()
            .eq('tag', 'Test staging');
          
          results.readyForTesting = true;
        } else {
          console.log(`   ❌ Erreur simulation: ${simulationError?.message || 'Pas de données retournées'}`);
        }
      } else {
        console.log('   ⚠️  Aucune conversation disponible pour le test');
      }
    } catch (err) {
      console.log(`   ❌ Erreur test simulation: ${err.message}`);
    }

    // Résultats finaux
    console.log('\n📋 Résultats de validation:');
    console.log(`   host_id: ${results.hostIdColumn ? '✅' : '❌'}`);
    console.log(`   conversation_analysis: ${results.conversationAnalysis ? '✅' : '❌'}`);
    console.log(`   intégrité données: ${results.dataIntegrity ? '✅' : '❌'}`);
    console.log(`   prêt pour tests: ${results.readyForTesting ? '✅' : '❌'}`);

    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
      console.log('\n🎉 Staging entièrement configuré et prêt!');
      console.log('Vous pouvez maintenant tester les fonctionnalités d\'urgence');
    } else {
      console.log('\n⚠️  Configuration incomplète');
      console.log('Référez-vous au guide scripts/staging-setup-guide.md');
    }

    return allPassed;

  } catch (error) {
    console.log(`❌ Erreur générale: ${error.message}`);
    return false;
  }
}

validateStagingFix();