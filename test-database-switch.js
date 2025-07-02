#!/usr/bin/env node
/**
 * Script de test pour valider le système de bascule de base de données
 * Vérifie que tous les fichiers sont correctement mis à jour
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { DATABASE_CONFIGS } from './switch-database.js';

class DatabaseSwitchTester {
  constructor() {
    this.testResults = [];
  }

  addTest(name, passed, details) {
    this.testResults.push({ name, passed, details });
    console.log(`${passed ? '✅' : '❌'} ${name}: ${details}`);
  }

  async testFileExists(filename) {
    const exists = fs.existsSync(filename);
    this.addTest(
      `Fichier ${filename}`,
      exists,
      exists ? 'Existe' : 'Manquant'
    );
    return exists;
  }

  async testEnvFile(expectedConfig) {
    if (!await this.testFileExists('.env')) return false;
    
    const content = fs.readFileSync('.env', 'utf8');
    
    // Vérifier l'URL
    const hasUrl = content.includes(expectedConfig.url);
    this.addTest(
      'URL dans .env',
      hasUrl,
      hasUrl ? 'Correcte' : `Attendue: ${expectedConfig.url}`
    );

    // Vérifier la clé
    const hasKey = content.includes(expectedConfig.anon_key);
    this.addTest(
      'Clé anon dans .env',
      hasKey,
      hasKey ? 'Correcte' : 'Incorrecte'
    );

    // Vérifier la clé service
    const hasServiceKey = content.includes(expectedConfig.service_role_key);
    this.addTest(
      'Clé service dans .env',
      hasServiceKey,
      hasServiceKey ? 'Correcte' : 'Incorrecte'
    );

    return hasUrl && hasKey && hasServiceKey;
  }

  async testSupabaseTs(expectedConfig) {
    if (!await this.testFileExists('src/lib/supabase.ts')) return false;
    
    const content = fs.readFileSync('src/lib/supabase.ts', 'utf8');
    
    const hasUrl = content.includes(expectedConfig.url);
    this.addTest(
      'URL dans supabase.ts',
      hasUrl,
      hasUrl ? 'Correcte' : `Attendue: ${expectedConfig.url}`
    );

    const hasKey = content.includes(expectedConfig.anon_key);
    this.addTest(
      'Clé dans supabase.ts',
      hasKey,
      hasKey ? 'Correcte' : 'Incorrecte'
    );

    return hasUrl && hasKey;
  }

  async testSupabaseConnection(config) {
    try {
      console.log(`\n🔄 Test de connexion à ${config.name}...`);
      
      const supabase = createClient(config.url, config.anon_key);
      
      // Test simple de connexion
      const { data, error } = await supabase.from('conversations').select('count').limit(1);
      
      if (error) {
        this.addTest(
          `Connexion ${config.name}`,
          false,
          `Erreur: ${error.message}`
        );
        return false;
      }
      
      this.addTest(
        `Connexion ${config.name}`,
        true,
        'Connexion réussie'
      );
      return true;
      
    } catch (error) {
      this.addTest(
        `Connexion ${config.name}`,
        false,
        `Exception: ${error.message}`
      );
      return false;
    }
  }

  async testCurrentConfiguration() {
    console.log('\n========== TEST CONFIGURATION ACTUELLE ==========');
    
    // Lire la configuration actuelle
    if (!fs.existsSync('.env')) {
      console.log('❌ Fichier .env manquant');
      return false;
    }

    const envContent = fs.readFileSync('.env', 'utf8');
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
    
    if (!urlMatch) {
      console.log('❌ URL Supabase non trouvée dans .env');
      return false;
    }

    const currentUrl = urlMatch[1].trim();
    console.log(`📍 URL actuelle: ${currentUrl}`);

    // Identifier l'environnement
    let currentConfig = null;
    let currentEnv = null;
    
    for (const [env, config] of Object.entries(DATABASE_CONFIGS)) {
      if (config.url === currentUrl) {
        currentConfig = config;
        currentEnv = env;
        break;
      }
    }

    if (!currentConfig) {
      console.log('❌ Configuration non reconnue');
      return false;
    }

    console.log(`🎯 Environnement détecté: ${currentConfig.name}`);

    // Tester tous les fichiers
    const envOk = await this.testEnvFile(currentConfig);
    const tsOk = await this.testSupabaseTs(currentConfig);
    const connectionOk = await this.testSupabaseConnection(currentConfig);

    return envOk && tsOk && connectionOk;
  }

  async testAllEnvironments() {
    console.log('\n========== TEST CONNEXIONS TOUTES BASES ==========');
    
    let allPassed = true;
    
    for (const [env, config] of Object.entries(DATABASE_CONFIGS)) {
      const connectionOk = await this.testSupabaseConnection(config);
      if (!connectionOk) allPassed = false;
    }
    
    return allPassed;
  }

  async testWorkflowFiles() {
    console.log('\n========== TEST FICHIERS WORKFLOWS ==========');
    
    const filesToCheck = [
      'whatsapp-webhook-server.js',
      'openai_service.py',
      'create-conversation-from-booking.js'
    ];

    let allExist = true;
    
    for (const file of filesToCheck) {
      const exists = await this.testFileExists(file);
      if (!exists) allExist = false;
    }

    return allExist;
  }

  printSummary() {
    console.log('\n========== RÉSUMÉ DES TESTS ==========');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`📊 Tests réussis: ${passed}/${total} (${percentage}%)`);
    
    if (percentage === 100) {
      console.log('🎉 Tous les tests sont passés!');
    } else {
      console.log('⚠️ Certains tests ont échoué:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`   ❌ ${r.name}: ${r.details}`));
    }
    
    return percentage === 100;
  }
}

async function main() {
  const tester = new DatabaseSwitchTester();
  
  console.log('🧪 Test du système de bascule de base de données');
  console.log('================================================');
  
  try {
    // Tests des fichiers de base
    await tester.testWorkflowFiles();
    
    // Test de la configuration actuelle
    await tester.testCurrentConfiguration();
    
    // Test de connexion à toutes les bases
    await tester.testAllEnvironments();
    
    // Résumé final
    const allPassed = tester.printSummary();
    
    if (allPassed) {
      console.log('\n✅ Le système est prêt pour les bascules de base de données');
    } else {
      console.log('\n❌ Des problèmes ont été détectés. Vérifiez la configuration.');
    }
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error(`❌ Erreur lors des tests: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}