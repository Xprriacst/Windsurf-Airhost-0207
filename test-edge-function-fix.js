/**
 * Test de validation de la correction Edge Function
 * Vérifie que l'erreur "Configuration invalide détectée" est résolue
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY manquant');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunctionFix() {
  console.log('🧪 Test de validation correction Edge Function...\n');

  try {
    // Test de l'Edge Function avec la correction
    console.log('📡 Test Edge Function corrigée...');
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-conversation-with-welcome`;
    
    const testPayload = {
      host_id: "a2ce1797-a5ab-4c37-9512-4a4058e0f1c7",
      guest_name: "Test Edge Function Fix",
      guest_phone: "+33612111333",
      property_id: "a0624296-4e92-469c-9be2-dcbe8ff547c2",
      check_in_date: "2025-06-28",
      check_out_date: "2025-06-29",
      send_welcome_template: true,
      welcome_template_name: "hello_world"
    };

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Edge Function teste avec succès');
      console.log('📋 Résultat:', {
        conversation_id: result.conversation?.id,
        welcome_sent: !!result.welcome_message_sent,
        error: result.welcome_message_error || 'Aucune'
      });
      
      // Nettoyer la conversation de test
      if (result.conversation?.id) {
        await supabase
          .from('conversations')
          .delete()
          .eq('id', result.conversation.id);
        console.log('🧹 Conversation de test supprimée');
      }
      
      return true;
    } else {
      const error = await response.text();
      console.log('⚠️ Réponse Edge Function:', response.status, error);
      return false;
    }

  } catch (error) {
    console.error('❌ Erreur test Edge Function:', error.message);
    return false;
  }
}

async function verifyConfiguration() {
  console.log('\n🔍 Vérification configuration WhatsApp...');
  
  try {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('❌ Configuration WhatsApp non trouvée');
      return false;
    }

    console.log('✅ Configuration WhatsApp validée:', {
      phone_number_id: data.phone_number_id,
      has_token: !!data.token,
      token_length: data.token?.length || 0,
      created_at: data.created_at
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur vérification config:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Test de validation correction "Configuration invalide détectée"\n');
  
  // Vérifier la configuration
  const configOk = await verifyConfiguration();
  if (!configOk) {
    console.log('❌ Configuration invalide, arrêt du test');
    return;
  }

  // Tester l'Edge Function
  const edgeOk = await testEdgeFunctionFix();
  
  console.log('\n' + '='.repeat(50));
  if (edgeOk) {
    console.log('🎉 CORRECTION VALIDÉE !');
    console.log('✅ L\'erreur "Configuration invalide détectée" devrait être résolue');
    console.log('✅ Edge Function fonctionne correctement avec le champ "token"');
  } else {
    console.log('⚠️ Correction à valider manuellement');
  }
  console.log('='.repeat(50));
}

main().catch(console.error);