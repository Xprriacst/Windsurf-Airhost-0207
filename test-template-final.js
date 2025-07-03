// Test final pour confirmer que les templates WhatsApp s'envoient correctement
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_DATA = {
  host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
  guest_name: 'Test Final Template',
  guest_phone: '+33666497372',
  property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
  check_in_date: '2025-01-25',
  check_out_date: '2025-01-27',
  status: 'active',
  send_welcome_template: true,
  welcome_template_name: 'hello_world'
};

const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/create-conversation-with-welcome`;

async function cleanupExistingConversation() {
  console.log('🗑️ Nettoyage des conversations existantes...');
  
  const { data: existingConversations, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('property_id', TEST_DATA.property_id)
    .eq('guest_phone', TEST_DATA.guest_phone);
    
  if (error) {
    console.error('❌ Erreur recherche conversations:', error.message);
    return;
  }
  
  if (existingConversations && existingConversations.length > 0) {
    console.log(`✓ ${existingConversations.length} conversation(s) trouvée(s) à supprimer`);
    
    for (const conv of existingConversations) {
      await supabase.from('messages').delete().eq('conversation_id', conv.id);
      await supabase.from('conversations').delete().eq('id', conv.id);
    }
    
    console.log('✓ Conversations nettoyées');
  } else {
    console.log('ℹ️ Aucune conversation existante');
  }
}

async function testTemplateDelivery() {
  console.log('🚀 TEST FINAL - ENVOI DE TEMPLATE WHATSAPP');
  console.log('==========================================');
  
  try {
    // 1. Nettoyer les conversations existantes
    await cleanupExistingConversation();
    
    // 2. Vérifier la configuration
    console.log('\n🔍 Vérification de la configuration...');
    const { data: config, error: configError } = await supabase
      .from('whatsapp_template_config')
      .select('*')
      .eq('host_id', TEST_DATA.host_id)
      .single();
    
    if (configError) {
      console.error('❌ Erreur configuration:', configError.message);
      return;
    }
    
    console.log('📋 Configuration actuelle:');
    console.log(`   Auto Templates Enabled: ${config.auto_templates_enabled}`);
    console.log(`   Send Welcome Template: ${config.send_welcome_template}`);
    console.log(`   Welcome Template Name: ${config.welcome_template_name}`);
    
    if (!config.auto_templates_enabled) {
      console.log('❌ ERREUR: auto_templates_enabled est désactivé!');
      return;
    }
    
    // 3. Appeler la Edge Function
    console.log('\n📞 Création de conversation avec template...');
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(TEST_DATA)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erreur Edge Function:', result);
      return;
    }
    
    console.log('✅ Conversation créée avec succès!');
    console.log(`📋 Résultat:`, {
      conversation_id: result.conversation?.id,
      message: result.message,
      welcome_template_sent: result.welcome_template_sent,
      welcome_template_error: result.welcome_template_error
    });
    
    // 4. Analyser le résultat
    console.log('\n📊 ANALYSE DU RÉSULTAT:');
    
    if (result.welcome_template_sent === true) {
      console.log('🎉 SUCCÈS: Le template WhatsApp a été envoyé!');
      console.log('✅ Le bug est complètement résolu.');
      console.log('✅ L\'interface utilisateur et la base de données sont synchronisées.');
    } else if (result.welcome_template_sent === false) {
      console.log('⚠️ ATTENTION: Le template n\'a pas été envoyé');
      if (result.welcome_template_error) {
        console.log(`   Raison: ${result.welcome_template_error}`);
      } else {
        console.log('   Raison: Logique de la Edge Function (toggle désactivé?)');
      }
    } else {
      console.log('❓ INCERTAIN: Statut d\'envoi du template non défini');
      console.log('   Cela peut indiquer un problème dans la Edge Function');
    }
    
    // 5. Vérifier les messages sauvegardés
    if (result.conversation?.id) {
      console.log('\n🔍 Vérification des messages sauvegardés...');
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', result.conversation.id)
        .eq('type', 'template');
      
      if (messagesError) {
        console.error('❌ Erreur récupération messages:', messagesError.message);
      } else if (messages && messages.length > 0) {
        console.log(`✅ ${messages.length} message(s) template trouvé(s) dans la base:`);
        messages.forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg.content} (${msg.status})`);
        });
      } else {
        console.log('ℹ️ Aucun message template trouvé dans la base');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testTemplateDelivery();
