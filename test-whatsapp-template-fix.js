// Script de test automatisé pour vérifier la correction du bug WhatsApp template
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Données de test basées sur le payload Zapier fourni
const TEST_DATA = {
  host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
  guest_name: 'Test Auto Template Bug',
  guest_phone: '+33666497372',
  property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
  check_in_date: '2025-01-25',
  check_out_date: '2025-01-27',
  status: 'active',
  send_welcome_template: true,
  welcome_template_name: 'hello_world'
};

// URL de la Edge Function
const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/create-conversation-with-welcome`;

async function deleteExistingConversation() {
  console.log('🗑️ Suppression de la conversation existante...');
  
  try {
    // Trouver la conversation existante
    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('property_id', TEST_DATA.property_id)
      .eq('guest_phone', TEST_DATA.guest_phone)
      .eq('check_in_date', TEST_DATA.check_in_date)
      .eq('check_out_date', TEST_DATA.check_out_date)
      .single();
      
    if (findError && findError.code !== 'PGRST116') { // PGRST116 = pas de résultat trouvé
      console.error('❌ Erreur lors de la recherche de conversation:', findError.message);
      return;
    }
    
    if (existingConversation) {
      console.log(`✓ Conversation trouvée: ${existingConversation.id}`);
      
      // Supprimer les messages d'abord
      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', existingConversation.id);
        
      if (deleteMessagesError) {
        console.error('❌ Erreur suppression messages:', deleteMessagesError.message);
      } else {
        console.log('✓ Messages supprimés');
      }
      
      // Supprimer la conversation
      const { error: deleteConversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', existingConversation.id);
        
      if (deleteConversationError) {
        console.error('❌ Erreur suppression conversation:', deleteConversationError.message);
      } else {
        console.log('✓ Conversation supprimée');
      }
    } else {
      console.log('ℹ️ Aucune conversation existante trouvée');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
  }
}

async function updateTemplateConfig(autoTemplatesEnabled) {
  console.log(`⚙️ Configuration auto_templates_enabled = ${autoTemplatesEnabled}...`);
  
  try {
    const { error } = await supabase
      .from('whatsapp_template_config')
      .update({ 
        auto_templates_enabled: autoTemplatesEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('host_id', TEST_DATA.host_id);
      
    if (error) {
      console.error('❌ Erreur mise à jour config:', error.message);
      return false;
    }
    
    console.log(`✓ Configuration mise à jour: auto_templates_enabled = ${autoTemplatesEnabled}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur configuration:', error);
    return false;
  }
}

async function callEdgeFunction() {
  console.log('📞 Appel de la Edge Function...');
  
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(TEST_DATA)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Edge Function appelée avec succès');
      console.log('📋 Résultat:', {
        message: result.message,
        conversation_id: result.conversation?.id,
        welcome_template_sent: result.welcome_template_sent,
        welcome_template_error: result.welcome_template_error
      });
      return result;
    } else {
      console.error('❌ Erreur Edge Function:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur appel Edge Function:', error);
    return null;
  }
}

async function runTest(testName, autoTemplatesEnabled, expectedTemplateSent) {
  console.log(`\n🧪 TEST: ${testName}`);
  console.log('='.repeat(50));
  
  // 1. Supprimer conversation existante
  await deleteExistingConversation();
  
  // 2. Configurer le toggle
  const configSuccess = await updateTemplateConfig(autoTemplatesEnabled);
  if (!configSuccess) {
    console.log('❌ Test échoué - impossible de configurer le toggle');
    return false;
  }
  
  // 3. Attendre un peu pour la propagation
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 4. Appeler la Edge Function
  const result = await callEdgeFunction();
  if (!result) {
    console.log('❌ Test échoué - pas de résultat de la Edge Function');
    return false;
  }
  
  // 5. Vérifier le résultat
  const actualTemplateSent = result.welcome_template_sent;
  const testPassed = actualTemplateSent === expectedTemplateSent;
  
  console.log(`\n📊 RÉSULTAT DU TEST:`);
  console.log(`   Toggle auto_templates_enabled: ${autoTemplatesEnabled}`);
  console.log(`   Template envoyé attendu: ${expectedTemplateSent}`);
  console.log(`   Template envoyé réel: ${actualTemplateSent}`);
  console.log(`   Test réussi: ${testPassed ? '✅ OUI' : '❌ NON'}`);
  
  if (!testPassed) {
    console.log(`⚠️ ERREUR: Le template ${actualTemplateSent ? 'a été envoyé' : 'n\'a pas été envoyé'} alors qu'on s'attendait à ${expectedTemplateSent ? 'l\'envoyer' : 'ne pas l\'envoyer'}`);
  }
  
  return testPassed;
}

async function main() {
  console.log('🚀 TESTS AUTOMATISÉS - CORRECTION BUG WHATSAPP TEMPLATE');
  console.log('====================================================');
  
  const startTime = Date.now();
  
  // Test 1: Toggle désactivé - template ne doit PAS être envoyé
  const test1Passed = await runTest(
    'Toggle DÉSACTIVÉ (auto_templates_enabled = false)', 
    false, // auto_templates_enabled
    false  // expectedTemplateSent
  );
  
  // Test 2: Toggle activé - template DOIT être envoyé
  const test2Passed = await runTest(
    'Toggle ACTIVÉ (auto_templates_enabled = true)', 
    true,  // auto_templates_enabled
    true   // expectedTemplateSent
  );
  
  // Résumé final
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log(`\n🏁 RÉSUMÉ FINAL`);
  console.log('==============');
  console.log(`Test 1 (Toggle OFF): ${test1Passed ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`);
  console.log(`Test 2 (Toggle ON):  ${test2Passed ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`);
  console.log(`Durée totale: ${duration}s`);
  
  const allTestsPassed = test1Passed && test2Passed;
  
  if (allTestsPassed) {
    console.log(`\n🎉 TOUS LES TESTS SONT RÉUSSIS !`);
    console.log(`   Le bug a été corrigé avec succès.`);
    console.log(`   Le toggle auto_templates_enabled fonctionne correctement.`);
  } else {
    console.log(`\n💥 CERTAINS TESTS ONT ÉCHOUÉ !`);
    console.log(`   Le bug n'est peut-être pas complètement corrigé.`);
    console.log(`   Vérifiez la logique de la Edge Function.`);
  }
  
  // Remettre le toggle dans l'état original (désactivé)
  console.log(`\n🔄 Restauration de la configuration originale...`);
  await updateTemplateConfig(false);
  
  process.exit(allTestsPassed ? 0 : 1);
}

main().catch(console.error);
