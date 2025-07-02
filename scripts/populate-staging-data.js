#!/usr/bin/env node

// Script pour peupler l'instance staging avec des données de test

import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4MzY0NSwiZXhwIjoyMDU1MzU5NjQ1fQ.nbhxWUoyYT5a8XxpC2la9sMYMKDJL95YQ9hhFvy5tos';

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

async function populateStagingData() {
  console.log('🔄 Peuplement de l\'instance staging avec des données de test\n');

  try {
    // 1. Créer un utilisateur test
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'test-staging@airhost.com',
      password: 'StgTest2025!',
      email_confirm: true
    });

    if (userError && !userError.message.includes('already been registered')) {
      console.log(`❌ Erreur création utilisateur: ${userError.message}`);
      return;
    }

    console.log('✅ Utilisateur test configuré');

    // 2. Créer un host de test
    const { data: hostData, error: hostError } = await supabase
      .from('hosts')
      .insert({
        name: 'Host Staging Test',
        email: 'host-staging@airhost.com',
        phone: '+33123456789'
      })
      .select()
      .single();

    if (hostError) {
      console.log(`❌ Erreur création host: ${hostError.message}`);
      return;
    }

    console.log('✅ Host test créé');

    // 3. Créer une propriété de test
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .insert({
        name: 'Appartement Staging Test',
        address: '123 Rue du Test, Staging City',
        host_id: hostData.id
      })
      .select()
      .single();

    if (propertyError) {
      console.log(`❌ Erreur création propriété: ${propertyError.message}`);
      return;
    }

    console.log('✅ Propriété test créée');

    // 4. Créer des conversations de test
    const conversations = [
      {
        guest_name: 'Client Test Urgence',
        guest_phone: '+33987654321',
        property_id: propertyData.id,
        host_id: hostData.id,
        status: 'active'
      },
      {
        guest_name: 'Client Test Normal',
        guest_phone: '+33987654322',
        property_id: propertyData.id,
        host_id: hostData.id,
        status: 'active'
      }
    ];

    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert(conversations)
      .select();

    if (conversationError) {
      console.log(`❌ Erreur création conversations: ${conversationError.message}`);
      return;
    }

    console.log('✅ Conversations test créées');

    // 5. Ajouter des messages de test
    const messages = [
      {
        conversation_id: conversationData[0].id,
        content: 'URGENCE: La chaudière ne fonctionne plus et il fait très froid!',
        sender_type: 'guest',
        sender_name: 'Client Test Urgence'
      },
      {
        conversation_id: conversationData[1].id,
        content: 'Bonjour, où puis-je trouver les clés de la cave?',
        sender_type: 'guest',
        sender_name: 'Client Test Normal'
      }
    ];

    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert(messages)
      .select();

    if (messageError) {
      console.log(`❌ Erreur création messages: ${messageError.message}`);
      return;
    }

    console.log('✅ Messages test créés');

    // 6. Créer des analyses de test
    const analyses = [
      {
        conversation_id: conversationData[0].id,
        message_id: messageData[0].id,
        analysis_type: 'emergency',
        tag: 'Urgence critique',
        confidence: 0.95,
        explanation: 'Problème de chauffage en hiver - intervention immédiate requise',
        needs_attention: true
      },
      {
        conversation_id: conversationData[1].id,
        message_id: messageData[1].id,
        analysis_type: 'category',
        tag: 'Réponse connue',
        confidence: 0.80,
        explanation: 'Question standard sur les équipements',
        needs_attention: false
      }
    ];

    const { data: analysisData, error: analysisError } = await supabase
      .from('conversation_analysis')
      .insert(analyses)
      .select();

    if (analysisError) {
      console.log(`❌ Erreur création analyses: ${analysisError.message}`);
      return;
    }

    console.log('✅ Analyses test créées');

    // 7. Vérification finale
    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const { count: analysisCount } = await supabase
      .from('conversation_analysis')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 Résumé des données staging:');
    console.log(`   Conversations: ${convCount}`);
    console.log(`   Messages: ${msgCount}`);
    console.log(`   Analyses: ${analysisCount}`);

    console.log('\n🎉 Instance staging peuplée avec succès!');
    console.log('Credentials de test:');
    console.log('  Email: test-staging@airhost.com');
    console.log('  Password: StgTest2025!');

  } catch (error) {
    console.log(`❌ Erreur générale: ${error.message}`);
  }
}

populateStagingData();