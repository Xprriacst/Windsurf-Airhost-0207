#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lire directement le fichier .env
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

console.log('Configuration:', { supabaseUrl, hasKey: !!supabaseKey });
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticDatabase() {
  console.log('🔍 Diagnostic complet de la base de données\n');

  try {
    // 1. Conversations avec +33617370484
    console.log('1. Recherche conversations +33617370484:');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .or('guest_phone.ilike.%33617370484%,guest_phone.ilike.%617370484%')
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('Erreur:', convError);
    } else {
      console.log(`Trouvé ${conversations.length} conversation(s):`);
      conversations.forEach(conv => {
        console.log(`  ID: ${conv.id}`);
        console.log(`  Téléphone: ${conv.guest_phone}`);
        console.log(`  Nom: ${conv.guest_name}`);
        console.log(`  Email: ${conv.guest_email || 'N/A'}`);
        console.log(`  Dernier message: ${conv.last_message?.substring(0, 50)}...`);
        console.log(`  Date: ${conv.last_message_at}`);
        console.log('');
      });
    }

    // 2. Messages récents avec ce numéro
    console.log('2. Messages récents de +33617370484:');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_phone,
        created_at,
        conversation_analysis,
        conversation_id,
        conversations (
          guest_phone,
          guest_name
        )
      `)
      .ilike('sender_phone', '%617370484%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) {
      console.error('Erreur messages:', msgError);
    } else {
      console.log(`Trouvé ${messages.length} message(s):`);
      messages.forEach(msg => {
        console.log(`  Message: ${msg.content?.substring(0, 50)}...`);
        console.log(`  De: ${msg.sender_phone}`);
        console.log(`  Conversation téléphone: ${msg.conversations?.guest_phone}`);
        console.log(`  Conversation nom: ${msg.conversations?.guest_name}`);
        console.log(`  Conversation email: ${msg.conversations?.guest_email || 'N/A'}`);
        console.log(`  Analyse: ${msg.conversation_analysis}`);
        console.log(`  Date: ${msg.created_at}`);
        console.log('');
      });
    }

    // 3. Toutes les conversations récentes (24h)
    console.log('3. Toutes conversations récentes (24h):');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentConversations, error: recentError } = await supabase
      .from('conversations')
      .select('*')
      .gte('last_message_at', yesterday.toISOString())
      .order('last_message_at', { ascending: false });

    if (recentError) {
      console.error('Erreur conversations récentes:', recentError);
    } else {
      console.log(`Trouvé ${recentConversations.length} conversation(s) récente(s):`);
      recentConversations.forEach(conv => {
        console.log(`  ${conv.guest_phone} (${conv.guest_name}) - ${conv.guest_email || 'pas d\'email'}`);
        console.log(`    Dernier message: ${conv.last_message?.substring(0, 40)}...`);
        console.log(`    Date: ${conv.last_message_at}`);
      });
    }

    // 4. Vérifier les liens email/téléphone
    console.log('\n4. Recherche liens avec contact.polaris.ia@gmail.com:');
    const { data: emailLinked, error: emailError } = await supabase
      .from('conversations')
      .select('*')
      .ilike('guest_email', '%contact.polaris.ia@gmail.com%');

    if (!emailError && emailLinked) {
      console.log(`Trouvé ${emailLinked.length} conversation(s) avec cet email:`);
      emailLinked.forEach(conv => {
        console.log(`  Téléphone: ${conv.guest_phone}`);
        console.log(`  Nom: ${conv.guest_name}`);
        console.log(`  Email: ${conv.guest_email}`);
        console.log(`  Dernier message: ${conv.last_message?.substring(0, 40)}...`);
      });
    }

    // 5. Vérifier incohérences sender_phone vs guest_phone
    console.log('\n5. Vérification incohérences téléphone:');
    const { data: allMessages, error: allMsgError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_phone,
        conversation_id,
        conversations (guest_phone, guest_name)
      `)
      .gte('created_at', yesterday.toISOString());

    if (!allMsgError && allMessages) {
      const inconsistencies = allMessages.filter(msg => {
        if (!msg.sender_phone || !msg.conversations?.guest_phone) return false;
        const normalizedSender = msg.sender_phone.replace(/[^\d]/g, '');
        const normalizedGuest = msg.conversations.guest_phone.replace(/[^\d]/g, '');
        return normalizedSender !== normalizedGuest;
      });

      if (inconsistencies.length > 0) {
        console.log(`⚠️  ${inconsistencies.length} incohérence(s) détectée(s):`);
        inconsistencies.forEach(inc => {
          console.log(`  Message de: ${inc.sender_phone}`);
          console.log(`  Conversation: ${inc.conversations.guest_phone} (${inc.conversations.guest_name})`);
          console.log('');
        });
      } else {
        console.log('✅ Aucune incohérence téléphone détectée');
      }
    }

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

// Vérifier également l'endpoint de test
async function testWebhookMessage() {
  console.log('\n6. Test message simulé:');
  try {
    const testPayload = {
      field: 'messages',
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '15550104726',
          phone_number_id: '123456789'
        },
        contacts: [{
          profile: { name: 'Test Diagnostic' },
          wa_id: '33617370484'
        }],
        messages: [{
          from: '33617370484',
          id: `msg_diagnostic_${Date.now()}`,
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'text',
          text: {
            body: 'Test diagnostic - message de vérification depuis +33617370484'
          }
        }]
      }
    };

    const response = await fetch('http://localhost:3001/webhook/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    console.log(`Status test: ${response.status}`);
    const result = await response.text();
    console.log(`Réponse: ${result}`);

  } catch (error) {
    console.error('Erreur test webhook:', error.message);
  }
}

// Exécuter le diagnostic
await diagnosticDatabase();
await testWebhookMessage();