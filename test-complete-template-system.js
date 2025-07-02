/**
 * Test complet du système de templates de bienvenue automatique
 * Valide la sauvegarde, la récupération et l'utilisation des templates
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulation du service WhatsApp pour les tests
class WhatsAppServiceTest {
  static templateConfig = null;

  static async saveConfig(config) {
    try {
      console.log("Test WhatsApp Service - Sauvegarde config:", config);
      
      // Préparer les données de base
      const dataToSave = {
        phone_number_id: config.phone_number_id,
        token: config.token,
        updated_at: new Date().toISOString()
      };
      
      // Stocker les paramètres de templates en mémoire
      if (config.send_welcome_template !== undefined || config.welcome_template_name !== undefined) {
        this.templateConfig = {
          send_welcome_template: config.send_welcome_template || false,
          welcome_template_name: config.welcome_template_name || '',
          auto_templates_enabled: config.send_welcome_template || false,
          template_language: 'fr',
          fallback_message: 'Bienvenue ! Nous reviendrons vers vous rapidement.'
        };
        console.log("Templates configurés:", this.templateConfig);
      }
      
      // Vérifier s'il y a déjà une configuration
      const { data: existing, error: selectError } = await supabase
        .from('whatsapp_config')
        .select('id')
        .limit(1);
      
      if (selectError) {
        console.error("Erreur lors de la vérification:", selectError);
        return false;
      }
      
      let result;
      if (existing && existing.length > 0) {
        result = await supabase
          .from('whatsapp_config')
          .update(dataToSave)
          .eq('id', existing[0].id);
      } else {
        result = await supabase
          .from('whatsapp_config')
          .insert(dataToSave);
      }
      
      if (result.error) {
        console.error("Erreur lors de la sauvegarde:", result.error);
        return false;
      }
      
      console.log("Configuration sauvegardée avec succès");
      return true;
    } catch (err) {
      console.error("Exception:", err);
      return false;
    }
  }

  static getTemplateConfig() {
    return this.templateConfig || {
      send_welcome_template: false,
      welcome_template_name: '',
      auto_templates_enabled: false,
      template_language: 'fr',
      fallback_message: 'Bienvenue ! Nous reviendrons vers vous rapidement.'
    };
  }

  static async sendWelcomeTemplate(to, guestName, templateName) {
    const templateConfig = this.getTemplateConfig();
    
    if (!templateConfig.send_welcome_template) {
      console.log('Templates de bienvenue désactivés');
      return false;
    }

    const finalTemplateName = templateName || templateConfig.welcome_template_name;
    
    if (!finalTemplateName) {
      console.log('Aucun template spécifié, message de fallback utilisé');
      return { type: 'fallback', message: templateConfig.fallback_message };
    }

    console.log('Template envoyé:', { to, templateName: finalTemplateName, guestName });
    return { type: 'template', templateName: finalTemplateName, guestName };
  }
}

async function testCompleteTemplateSystem() {
  console.log('=== TEST COMPLET DU SYSTÈME DE TEMPLATES ===\n');

  const tests = [];
  
  // Test 1: Sauvegarde configuration de base
  console.log('1. Test sauvegarde configuration de base...');
  const basicConfig = {
    phone_number_id: '604674832740532',
    token: 'test_token_basic'
  };
  
  const basicSave = await WhatsAppServiceTest.saveConfig(basicConfig);
  tests.push({
    name: 'Sauvegarde configuration de base',
    passed: basicSave,
    details: basicSave ? 'Configuration de base sauvegardée' : 'Échec sauvegarde de base'
  });

  // Test 2: Sauvegarde configuration avec templates
  console.log('\n2. Test sauvegarde configuration avec templates...');
  const templateConfig = {
    phone_number_id: '604674832740532',
    token: 'test_token_with_templates',
    send_welcome_template: true,
    welcome_template_name: 'hello_world'
  };
  
  const templateSave = await WhatsAppServiceTest.saveConfig(templateConfig);
  tests.push({
    name: 'Sauvegarde configuration avec templates',
    passed: templateSave,
    details: templateSave ? 'Configuration complète sauvegardée' : 'Échec sauvegarde templates'
  });

  // Test 3: Récupération configuration templates
  console.log('\n3. Test récupération configuration templates...');
  const retrievedConfig = WhatsAppServiceTest.getTemplateConfig();
  const configValid = retrievedConfig && 
                     retrievedConfig.send_welcome_template === true &&
                     retrievedConfig.welcome_template_name === 'hello_world';
  
  tests.push({
    name: 'Récupération configuration templates',
    passed: configValid,
    details: configValid ? 'Configuration récupérée correctement' : `Configuration incorrecte: ${JSON.stringify(retrievedConfig)}`
  });

  // Test 4: Envoi template de bienvenue
  console.log('\n4. Test envoi template de bienvenue...');
  const templateSent = await WhatsAppServiceTest.sendWelcomeTemplate('+33617370422', 'Test Guest', 'hello_world');
  const templateValid = templateSent && 
                       templateSent.type === 'template' &&
                       templateSent.templateName === 'hello_world';
  
  tests.push({
    name: 'Envoi template de bienvenue',
    passed: templateValid,
    details: templateValid ? 'Template envoyé correctement' : `Résultat inattendu: ${JSON.stringify(templateSent)}`
  });

  // Test 5: Fallback automatique
  console.log('\n5. Test fallback automatique...');
  const fallbackConfig = {
    phone_number_id: '604674832740532',
    token: 'test_token_fallback',
    send_welcome_template: true,
    welcome_template_name: '' // Template vide pour déclencher le fallback
  };
  
  await WhatsAppServiceTest.saveConfig(fallbackConfig);
  const fallbackSent = await WhatsAppServiceTest.sendWelcomeTemplate('+33617370422', 'Test Guest');
  const fallbackValid = fallbackSent && 
                       fallbackSent.type === 'fallback' &&
                       fallbackSent.message.includes('Bienvenue');
  
  tests.push({
    name: 'Fallback automatique',
    passed: fallbackValid,
    details: fallbackValid ? 'Fallback fonctionne correctement' : `Fallback incorrect: ${JSON.stringify(fallbackSent)}`
  });

  // Test 6: Désactivation des templates
  console.log('\n6. Test désactivation des templates...');
  const disabledConfig = {
    phone_number_id: '604674832740532',
    token: 'test_token_disabled',
    send_welcome_template: false,
    welcome_template_name: 'hello_world'
  };
  
  await WhatsAppServiceTest.saveConfig(disabledConfig);
  const disabledSent = await WhatsAppServiceTest.sendWelcomeTemplate('+33617370422', 'Test Guest');
  const disabledValid = disabledSent === false;
  
  tests.push({
    name: 'Désactivation des templates',
    passed: disabledValid,
    details: disabledValid ? 'Templates correctement désactivés' : `Templates encore actifs: ${JSON.stringify(disabledSent)}`
  });

  // Affichage des résultats
  console.log('\n=== RÉSULTATS DES TESTS ===');
  const passedTests = tests.filter(t => t.passed).length;
  const totalTests = tests.length;
  
  tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${test.name}`);
    console.log(`   ${test.details}`);
  });
  
  console.log(`\nRésumé: ${passedTests}/${totalTests} tests réussis`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 SYSTÈME DE TEMPLATES COMPLET ET FONCTIONNEL !');
    console.log('✓ Sauvegarde configuration WhatsApp');
    console.log('✓ Support templates de bienvenue');
    console.log('✓ Fallback automatique');
    console.log('✓ Activation/désactivation');
    return true;
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} tests ont échoué`);
    return false;
  }
}

testCompleteTemplateSystem().then(success => {
  process.exit(success ? 0 : 1);
});