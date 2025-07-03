import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';
const EDGE_FUNCTION_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co/functions/v1/create-conversation-with-welcome';

async function setToggle(enabled) {
  console.log(`🔧 FORÇAGE - ${enabled ? 'Activation' : 'Désactivation'} du toggle`);
  console.log('='.repeat(50));
  
  const { data, error } = await supabase
    .from('whatsapp_template_config')
    .update({
      auto_templates_enabled: enabled,
      updated_at: new Date().toISOString()
    })
    .eq('host_id', HOST_ID)
    .select();
  
  if (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
  
  console.log(`✅ Toggle forcé à ${enabled ? 'ON' : 'OFF'}`);
  return true;
}

async function deleteConversations() {
  console.log('🗑️ Suppression des conversations existantes');
  console.log('='.repeat(50));
  
  const { data: conversations, error: fetchError } = await supabase
    .from('conversations')
    .select('id')
    .eq('host_id', HOST_ID);
  
  if (fetchError) {
    console.error('❌ Erreur lors de la récupération:', fetchError);
    return false;
  }
  
  if (!conversations || conversations.length === 0) {
    console.log('ℹ️ Aucune conversation à supprimer');
    return true;
  }
  
  const { error: deleteError } = await supabase
    .from('conversations')
    .delete()
    .eq('host_id', HOST_ID);
  
  if (deleteError) {
    console.error('❌ Erreur lors de la suppression:', deleteError);
    return false;
  }
  
  console.log(`✅ ${conversations.length} conversation(s) supprimée(s)`);
  return true;
}

async function testEdgeFunction(testName) {
  console.log(`📡 TEST EDGE FUNCTION - ${testName}`);
  console.log('='.repeat(50));
  
  const payload = {
    host_id: HOST_ID,
    guest_name: `test_${Date.now()}`,
    guest_phone: `+3378458${Math.floor(Math.random() * 10000)}`,
    property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
    check_in_date: '2025-06-21',
    check_out_date: '2025-06-22',
    send_welcome_template: true,
    welcome_template_name: 'hello_world'
  };
  
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('📋 Résultat:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 TEST COMPLET DE LA LOGIQUE TOGGLE');
  console.log('='.repeat(50));
  
  // Test 1: Toggle OFF
  console.log('\n🔴 TEST 1: TOGGLE OFF');
  console.log('='.repeat(30));
  
  await deleteConversations();
  await setToggle(false);
  const result1 = await testEdgeFunction('Toggle OFF');
  
  const templateSentOff = result1?.welcome_template_sent === true;
  console.log(`🎯 Résultat attendu: Template PAS envoyé`);
  console.log(`🎯 Résultat obtenu: Template ${templateSentOff ? 'ENVOYÉ' : 'PAS envoyé'}`);
  console.log(`${templateSentOff ? '❌ ÉCHEC' : '✅ SUCCÈS'} - Test Toggle OFF`);
  
  // Test 2: Toggle ON
  console.log('\n🟢 TEST 2: TOGGLE ON');
  console.log('='.repeat(30));
  
  await deleteConversations();
  await setToggle(true);
  const result2 = await testEdgeFunction('Toggle ON');
  
  const templateSentOn = result2?.welcome_template_sent === true;
  console.log(`🎯 Résultat attendu: Template envoyé`);
  console.log(`🎯 Résultat obtenu: Template ${templateSentOn ? 'ENVOYÉ' : 'PAS envoyé'}`);
  console.log(`${templateSentOn ? '✅ SUCCÈS' : '❌ ÉCHEC'} - Test Toggle ON`);
  
  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(50));
  console.log(`Toggle OFF: ${templateSentOff ? '❌ ÉCHEC' : '✅ SUCCÈS'}`);
  console.log(`Toggle ON:  ${templateSentOn ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
  
  const allTestsPassed = !templateSentOff && templateSentOn;
  console.log(`\n🎯 RÉSULTAT GLOBAL: ${allTestsPassed ? '✅ TOUS LES TESTS RÉUSSIS' : '❌ ÉCHECS DÉTECTÉS'}`);
  
  if (allTestsPassed) {
    console.log('🎉 La logique Edge Function fonctionne parfaitement !');
    console.log('🔧 Le problème vient de la synchronisation de l\'interface React.');
  } else {
    console.log('🚨 Il y a encore des problèmes dans la logique Edge Function.');
  }
}

main().catch(console.error);
