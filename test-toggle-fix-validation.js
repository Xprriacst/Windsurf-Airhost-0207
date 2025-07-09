const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const testHostId = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function cleanupTestConversations() {
  console.log('🧹 Nettoyage des conversations de test...');
  
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('host_id', testHostId)
    .ilike('guest_name', '%Test%');
  
  if (conversations && conversations.length > 0) {
    const conversationIds = conversations.map(c => c.id);
    
    // Supprimer les messages
    await supabase
      .from('messages')
      .delete()
      .in('conversation_id', conversationIds);
    
    // Supprimer les conversations
    await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds);
    
    console.log(`🗑️ ${conversations.length} conversations de test supprimées`);
  }
}

async function testToggleOFF() {
  console.log('\n🔴 TEST 1: Toggle OFF - Template ne doit PAS être envoyé');
  
  // 1. Mettre le toggle à OFF
  await supabase
    .from('whatsapp_template_config')
    .update({ 
      auto_templates_enabled: false,
      send_welcome_template: true,
      updated_at: new Date().toISOString()
    })
    .eq('host_id', testHostId);
  
  // 2. Vérifier l'état en base
  const { data: config } = await supabase
    .from('whatsapp_template_config')
    .select('auto_templates_enabled, send_welcome_template')
    .eq('host_id', testHostId)
    .single();
  
  console.log('📊 Configuration:', config);
  
  // 3. Tenter de créer une conversation
  const testPayload = {
    host_id: testHostId,
    guest_name: 'TestToggleOFF',
    guest_phone: '+33666497372',
    property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
    check_in_date: '2025-01-20',
    check_out_date: '2025-01-22',
    send_welcome_template: true,
    welcome_template_name: 'hello_world'
  };
  
  const response = await fetch(`${supabaseUrl}/functions/v1/create-conversation-with-welcome`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testPayload)
  });
  
  const result = await response.json();
  console.log('📤 Résultat Edge Function:', result);
  
  // 4. Vérifier qu'aucun template n'a été envoyé
  const templateSent = result.welcome_template_sent || false;
  console.log(`🎯 Template envoyé: ${templateSent} (attendu: false)`);
  
  return !templateSent; // Test réussi si template PAS envoyé
}

async function testToggleON() {
  console.log('\n🟢 TEST 2: Toggle ON - Template DOIT être envoyé');
  
  // 1. Mettre le toggle à ON
  await supabase
    .from('whatsapp_template_config')
    .update({ 
      auto_templates_enabled: true,
      send_welcome_template: true,
      updated_at: new Date().toISOString()
    })
    .eq('host_id', testHostId);
  
  // 2. Vérifier l'état en base
  const { data: config } = await supabase
    .from('whatsapp_template_config')
    .select('auto_templates_enabled, send_welcome_template')
    .eq('host_id', testHostId)
    .single();
  
  console.log('📊 Configuration:', config);
  
  // 3. Tenter de créer une conversation
  const testPayload = {
    host_id: testHostId,
    guest_name: 'TestToggleON',
    guest_phone: '+33666497373',
    property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
    check_in_date: '2025-01-20',
    check_out_date: '2025-01-22',
    send_welcome_template: true,
    welcome_template_name: 'hello_world'
  };
  
  const response = await fetch(`${supabaseUrl}/functions/v1/create-conversation-with-welcome`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testPayload)
  });
  
  const result = await response.json();
  console.log('📤 Résultat Edge Function:', result);
  
  // 4. Vérifier que le template a été envoyé
  const templateSent = result.welcome_template_sent || false;
  console.log(`🎯 Template envoyé: ${templateSent} (attendu: true)`);
  
  return templateSent; // Test réussi si template envoyé
}

async function runValidationTests() {
  console.log('🧪 VALIDATION DU FIX DU BUG TOGGLE WHATSAPP');
  console.log('='.repeat(50));
  
  try {
    // Nettoyer avant les tests
    await cleanupTestConversations();
    
    // Test 1: Toggle OFF
    const test1Success = await testToggleOFF();
    await cleanupTestConversations(); // Nettoyer entre les tests
    
    // Test 2: Toggle ON
    const test2Success = await testToggleON();
    await cleanupTestConversations(); // Nettoyer après les tests
    
    // Résultats
    console.log('\n📋 RÉSULTATS DES TESTS:');
    console.log('='.repeat(30));
    console.log(`🔴 Toggle OFF: ${test1Success ? '✅ RÉUSSI' : '❌ ÉCHEC'}`);
    console.log(`🟢 Toggle ON:  ${test2Success ? '✅ RÉUSSI' : '❌ ÉCHEC'}`);
    
    const allTestsPassed = test1Success && test2Success;
    console.log(`\n🎯 RÉSULTAT GLOBAL: ${allTestsPassed ? '✅ TOUS LES TESTS RÉUSSIS' : '❌ ÉCHEC'}`);
    
    if (allTestsPassed) {
      console.log('🎉 Le bug du toggle WhatsApp est CORRIGÉ !');
    } else {
      console.log('⚠️ Le bug persiste, investigation nécessaire.');
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    return false;
  }
}

runValidationTests();
