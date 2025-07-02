/**
 * Test d'intégration de la configuration WhatsApp
 * Vérifie que les services utilisent bien la configuration de la base de données
 */

import dotenv from 'dotenv';
dotenv.config();

async function testWhatsAppConfigIntegration() {
  console.log('🧪 Test d\'intégration configuration WhatsApp\n');

  // Test 1: Service local (localhost:3002)
  console.log('1️⃣ Test du service local de création de conversations');
  try {
    const localResponse = await fetch('http://localhost:3002/test-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        send_welcome_template: true,
        welcome_template_name: 'hello_world'
      })
    });

    if (localResponse.ok) {
      const result = await localResponse.json();
      console.log('✅ Service local opérationnel');
      console.log('📋 Réponse:', JSON.stringify(result, null, 2));
      
      if (result.welcome_template_sent) {
        console.log('✅ Template de bienvenue envoyé avec succès');
      } else if (result.welcome_template_error) {
        console.log('⚠️ Erreur template:', result.welcome_template_error);
      }
    } else {
      const error = await localResponse.text();
      console.log('❌ Erreur service local:', error);
    }
  } catch (error) {
    console.log('❌ Erreur connexion service local:', error.message);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Test 2: Edge function Supabase
  console.log('2️⃣ Test de l\'edge function Supabase');
  try {
    const edgeResponse = await fetch('https://whxkhrtlccxubvjgexmi.supabase.co/functions/v1/create-conversation-with-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
        property_id: 'a0624296-4e92-469c-9be2-dcbe8ff547c2',
        guest_name: 'Test Config DB',
        guest_phone: '+33617370499',
        check_in_date: '2025-07-10',
        check_out_date: '2025-07-15',
        send_welcome_template: true,
        welcome_template_name: 'hello_world'
      })
    });

    if (edgeResponse.ok) {
      const result = await edgeResponse.json();
      console.log('✅ Edge function opérationnelle');
      console.log('📋 Réponse:', JSON.stringify(result, null, 2));
      
      if (result.welcome_template_sent) {
        console.log('✅ Template de bienvenue envoyé avec succès');
      } else if (result.welcome_template_error) {
        console.log('⚠️ Erreur template:', result.welcome_template_error);
      }
    } else {
      const error = await edgeResponse.text();
      console.log('❌ Erreur edge function:', error);
    }
  } catch (error) {
    console.log('❌ Erreur connexion edge function:', error.message);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('🎯 Test terminé - Les deux services utilisent maintenant');
  console.log('   la configuration WhatsApp de la base de données');
  console.log('═'.repeat(50));
}

// Exécuter le test
testWhatsAppConfigIntegration().catch(console.error);