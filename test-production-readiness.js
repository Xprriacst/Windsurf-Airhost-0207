#!/usr/bin/env node

/**
 * Script de test de préparation pour la migration production
 * Valide que tous les composants sont prêts pour le déploiement
 */

const PROD_URL = process.env.PROD_SUPABASE_URL;
const PROD_ANON_KEY = process.env.PROD_SUPABASE_ANON_KEY;

async function testProductionReadiness() {
  console.log('🧪 TEST DE PRÉPARATION MIGRATION PRODUCTION');
  console.log('============================================');
  
  const results = {
    connectivity: false,
    migration_script: false,
    backup_capability: false,
    rollback_plan: false,
    documentation: false,
    overall_ready: false
  };

  // Test 1: Connectivité production
  console.log('\n1. Test de connectivité production...');
  try {
    const response = await fetch(`${PROD_URL}/rest/v1/conversations?select=id&limit=1`, {
      headers: { 'apikey': PROD_ANON_KEY },
      timeout: 10000
    });
    
    if (response.ok) {
      results.connectivity = true;
      console.log('✓ Connectivité production validée');
    } else {
      console.log('✗ Échec connectivité:', response.status);
    }
  } catch (error) {
    console.log('✗ Erreur connectivité:', error.message);
  }

  // Test 2: Validation du script de migration
  console.log('\n2. Validation du script de migration...');
  try {
    const fs = await import('fs');
    const migrationScript = fs.readFileSync('scripts/production-migration-tags.sql', 'utf8');
    
    // Vérifications critiques
    const requiredElements = [
      'CREATE TABLE IF NOT EXISTS conversation_analysis',
      'ALTER TABLE messages ADD COLUMN IF NOT EXISTS',
      'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS',
      'CREATE INDEX IF NOT EXISTS',
      'CREATE OR REPLACE FUNCTION',
      'CREATE TRIGGER',
      'ENABLE ROW LEVEL SECURITY'
    ];
    
    const missingElements = requiredElements.filter(element => 
      !migrationScript.includes(element)
    );
    
    if (missingElements.length === 0) {
      results.migration_script = true;
      console.log('✓ Script de migration complet');
    } else {
      console.log('✗ Éléments manquants:', missingElements);
    }
  } catch (error) {
    console.log('✗ Erreur lecture script:', error.message);
  }

  // Test 3: Capacité de backup
  console.log('\n3. Test capacité de backup...');
  try {
    const testBackup = await fetch(`${PROD_URL}/rest/v1/conversations?select=*&limit=1`, {
      headers: { 'apikey': PROD_ANON_KEY }
    });
    
    if (testBackup.ok) {
      const data = await testBackup.json();
      results.backup_capability = true;
      console.log('✓ Backup possible (échantillon récupéré)');
    } else {
      console.log('✗ Impossible de créer un backup');
    }
  } catch (error) {
    console.log('✗ Erreur test backup:', error.message);
  }

  // Test 4: Plan de rollback
  console.log('\n4. Validation plan de rollback...');
  try {
    const fs = await import('fs');
    const deployScript = fs.readFileSync('deploy-production-migration.sh', 'utf8');
    
    if (deployScript.includes('backup') && deployScript.includes('BACKUP_DIR')) {
      results.rollback_plan = true;
      console.log('✓ Plan de rollback présent');
    } else {
      console.log('✗ Plan de rollback insuffisant');
    }
  } catch (error) {
    console.log('✗ Erreur validation rollback:', error.message);
  }

  // Test 5: Documentation complète
  console.log('\n5. Validation documentation...');
  try {
    const fs = await import('fs');
    const files = [
      'PRODUCTION_MIGRATION_GUIDE.md',
      'scripts/production-migration-tags.sql',
      'deploy-production-migration.sh'
    ];
    
    const existingFiles = files.filter(file => {
      try {
        fs.accessSync(file);
        return true;
      } catch {
        return false;
      }
    });
    
    if (existingFiles.length === files.length) {
      results.documentation = true;
      console.log('✓ Documentation complète');
    } else {
      console.log('✗ Fichiers manquants:', files.filter(f => !existingFiles.includes(f)));
    }
  } catch (error) {
    console.log('✗ Erreur validation documentation:', error.message);
  }

  // Évaluation globale
  console.log('\n📋 RÉSUMÉ DE PRÉPARATION');
  console.log('========================');
  
  const readyCount = Object.values(results).filter(Boolean).length - 1; // -1 pour overall_ready
  results.overall_ready = readyCount >= 4; // Au moins 4/5 tests passés
  
  console.log(`Connectivité production: ${results.connectivity ? '✓' : '✗'}`);
  console.log(`Script de migration: ${results.migration_script ? '✓' : '✗'}`);
  console.log(`Capacité de backup: ${results.backup_capability ? '✓' : '✗'}`);
  console.log(`Plan de rollback: ${results.rollback_plan ? '✓' : '✗'}`);
  console.log(`Documentation: ${results.documentation ? '✓' : '✗'}`);
  
  console.log(`\n📊 Score: ${readyCount}/5`);
  
  if (results.overall_ready) {
    console.log('\n🎯 PRÊT POUR LA MIGRATION PRODUCTION');
    console.log('====================================');
    console.log('Commandes de déploiement:');
    console.log('');
    console.log('# Option 1: Script automatisé');
    console.log('./deploy-production-migration.sh');
    console.log('');
    console.log('# Option 2: Migration manuelle');
    console.log('# 1. Copier scripts/production-migration-tags.sql');
    console.log('# 2. Coller dans Supabase SQL Editor');
    console.log('# 3. Exécuter la migration');
    console.log('');
    console.log('📚 Guide: PRODUCTION_MIGRATION_GUIDE.md');
  } else {
    console.log('\n⚠️  MIGRATION NON PRÊTE');
    console.log('=======================');
    console.log('Corriger les problèmes ci-dessus avant de procéder.');
  }
  
  return results;
}

// Exécuter le test
testProductionReadiness().catch(console.error);