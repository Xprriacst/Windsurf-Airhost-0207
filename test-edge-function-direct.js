/**
 * Test direct de l'Edge Function create-conversation-with-welcome
 */

import { createClient } from '@supabase/supabase-js';

// Configuration directe (pour le test)
const supabaseUrl = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU0MDk0OSwiZXhwIjoyMDY1MTE2OTQ5fQ.0Ie3N_BwEMb9a5FY9vq2ot4jgJQlUJA7I3IUQL97a4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  console.log('🧪 Test direct de l\'Edge Function create-conversation-with-welcome');
  console.log('================================================================');

  try {
    // Données de test pour créer une conversation avec template
    const testData = {
      host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7', // ID utilisateur de test
      guest_name: 'Test Direct Edge Function',
      guest_phone: '+33699887766',
      property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097', // ID propriété de test
      check_in_date: '2025-08-15',
      check_out_date: '2025-08-18',
      send_welcome_template: true,
      welcome_template_name: 'welcome_checkin'
    };

    console.log('Envoi des données à l\'Edge Function:', testData);

    // Appel de l'Edge Function
    const { data, error } = await supabase.functions.invoke('create-conversation-with-welcome', {
      body: testData
    });

    console.log('\n--- RÉSULTAT DE L\'EDGE FUNCTION ---');
    console.log('Données reçues:', JSON.stringify(data, null, 2));
    console.log('Erreur:', error);

    // Vérifier si la conversation a été créée
    if (data && data.conversation) {
      console.log('\n--- VÉRIFICATION DANS LA BASE ---');
      const { data: conversationInDB, error: dbError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', data.conversation.id)
        .single();

      if (dbError) {
        console.error('Erreur lors de la vérification:', dbError);
      } else {
        console.log('Conversation trouvée dans la DB:', conversationInDB);
      }

      // Vérifier s'il y a des messages (template envoyé)
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', data.conversation.id);

      if (messagesError) {
        console.error('Erreur lors de la récupération des messages:', messagesError);
      } else {
        console.log('Messages trouvés:', messages?.length || 0);
        if (messages && messages.length > 0) {
          messages.forEach(msg => {
            console.log(`- ${msg.type}: ${msg.content} (${msg.direction})`);
          });
        }
      }
    }

    // Vérifier la configuration des templates WhatsApp
    console.log('\n--- VÉRIFICATION CONFIG WHATSAPP TEMPLATES ---');
    const { data: templateConfig, error: templateError } = await supabase
      .from('whatsapp_template_config')
      .select('*')
      .eq('host_id', testData.host_id);

    if (templateError) {
      console.error('Erreur config template:', templateError);
    } else {
      console.log('Configuration template trouvée:', templateConfig);
    }

    // Vérifier la configuration WhatsApp
    console.log('\n--- VÉRIFICATION CONFIG WHATSAPP ---');
    const { data: whatsappConfig, error: whatsappError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('host_id', testData.host_id);

    if (whatsappError) {
      console.error('Erreur config WhatsApp:', whatsappError);
    } else {
      console.log('Configuration WhatsApp trouvée:', whatsappConfig);
    }

  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

// Fonction de nettoyage
async function cleanup() {
  console.log('\n🧹 Nettoyage des données de test');
  
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('guest_name', 'Test Direct Edge Function');

    if (error) {
      console.error('Erreur lors du nettoyage:', error);
    } else {
      console.log('✅ Données de test supprimées');
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
  }
}

// Exécution
async function run() {
  await testEdgeFunction();
  
  setTimeout(async () => {
    await cleanup();
  }, 3000);
}

run();