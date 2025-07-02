/**
 * Test de la création de conversation avec template de bienvenue automatique
 * Teste la edge function Supabase et l'intégration des templates WhatsApp
 */

import { createClient } from '@supabase/supabase-js';

// Configuration de test
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConversationCreationWithTemplate() {
  console.log('🧪 Test de création de conversation avec template de bienvenue');
  console.log('===============================================================');

  try {
    // Test 1: Création de conversation sans template
    console.log('\n1. Test création conversation classique (sans template)');
    
    const testData1 = {
      host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7', // ID de test développement
      guest_name: 'Test Sans Template',
      guest_phone: '+33612345678',
      property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
      check_in_date: '2025-06-20',
      check_out_date: '2025-06-22',
      send_welcome_template: false
    };

    const response1 = await supabase.functions.invoke('create-conversation-with-welcome', {
      body: testData1
    });

    console.log('Réponse:', response1.data);
    console.log('Erreur:', response1.error);

    // Test 2: Création de conversation avec template
    console.log('\n2. Test création conversation avec template de bienvenue');
    
    const testData2 = {
      host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
      guest_name: 'Test Avec Template',
      guest_phone: '+33687654321',
      property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
      check_in_date: '2025-06-25',
      check_out_date: '2025-06-27',
      send_welcome_template: true,
      welcome_template_name: 'welcome_checkin'
    };

    const response2 = await supabase.functions.invoke('create-conversation-with-welcome', {
      body: testData2
    });

    console.log('Réponse:', response2.data);
    console.log('Erreur:', response2.error);

    // Test 3: Vérifier que les conversations ont été créées
    console.log('\n3. Vérification des conversations créées');
    
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .in('guest_name', ['Test Sans Template', 'Test Avec Template'])
      .order('created_at', { ascending: false });

    if (conversationsError) {
      console.error('Erreur lors de la récupération des conversations:', conversationsError);
    } else {
      console.log('Conversations créées:');
      conversations.forEach(conv => {
        console.log(`- ${conv.guest_name} (${conv.guest_phone}) - Property: ${conv.property_id}`);
      });
    }

    // Test 4: Test de configuration WhatsApp avec templates
    console.log('\n4. Test configuration WhatsApp avec templates');
    
    const configData = {
      phone_number_id: '123456789012345',
      token: 'test_token_development',
      send_welcome_template: true,
      welcome_template_name: 'welcome_checkin'
    };

    const { error: configError } = await supabase
      .from('whatsapp_config')
      .upsert(configData);

    if (configError) {
      console.error('Erreur lors de la sauvegarde de la config:', configError);
    } else {
      console.log('✅ Configuration WhatsApp avec template sauvegardée');
    }

    // Test 5: Récupération de la configuration
    console.log('\n5. Test récupération configuration WhatsApp');
    
    const { data: config, error: getConfigError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (getConfigError) {
      console.error('Erreur lors de la récupération de la config:', getConfigError);
    } else {
      console.log('Configuration récupérée:', config[0]);
    }

    console.log('\n✅ Tous les tests terminés');

  } catch (error) {
    console.error('Erreur lors des tests:', error);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Nettoyage des données de test');
  
  try {
    // Supprimer les conversations de test
    const { error } = await supabase
      .from('conversations')
      .delete()
      .in('guest_name', ['Test Sans Template', 'Test Avec Template']);

    if (error) {
      console.error('Erreur lors du nettoyage:', error);
    } else {
      console.log('✅ Données de test supprimées');
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
  }
}

// Exécution des tests
async function runTests() {
  await testConversationCreationWithTemplate();
  
  // Attendre 2 secondes avant le nettoyage
  setTimeout(async () => {
    await cleanupTestData();
  }, 2000);
}

runTests();