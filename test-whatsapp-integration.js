#!/usr/bin/env node

/**
 * Test d'intégration WhatsApp avec analyse GPT-4o
 * Simule la réception de messages WhatsApp et vérifie l'analyse
 */

import fetch from 'node-fetch';

const WEBHOOK_URL = 'http://localhost:3001/webhook/whatsapp';

// Messages de test avec différents scénarios
const testMessages = [
  {
    scenario: 'Question restaurant (Réponse connue)',
    content: 'Bonjour, pouvez-vous me recommander des restaurants près du logement ?'
  },
  {
    scenario: 'Client mécontent',
    content: 'Je suis très déçu de mon séjour, il y a plusieurs problèmes dans l\'appartement.'
  },
  {
    scenario: 'Urgence critique',
    content: 'Aide ! Il y a une fuite d\'eau importante dans la salle de bain, c\'est urgent !'
  },
  {
    scenario: 'Escalade comportementale',
    content: 'C\'est inacceptable ! Je vais porter plainte et écrire des avis négatifs partout !'
  },
  {
    scenario: 'Intervention hôte requise',
    content: 'Je n\'arrive pas à ouvrir la porte d\'entrée avec le code que vous m\'avez donné.'
  }
];

// Simulation d'un webhook WhatsApp
function createWhatsAppWebhook(messageContent, phoneNumber = '+33123456789') {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'entry_id',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '+33987654321',
            phone_number_id: 'phone_number_id_123'
          },
          contacts: [{
            profile: {
              name: 'Client Test'
            },
            wa_id: phoneNumber.replace('+', '')
          }],
          messages: [{
            from: phoneNumber.replace('+', ''),
            id: `msg_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: {
              body: messageContent
            },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
}

async function testWebhook(testMessage) {
  console.log(`\n🧪 Test: ${testMessage.scenario}`);
  console.log(`📝 Message: "${testMessage.content}"`);
  
  const webhook = createWhatsAppWebhook(testMessage.content);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhook)
    });
    
    if (response.ok) {
      console.log(`✅ Webhook traité avec succès (${response.status})`);
      const result = await response.text();
      console.log(`📊 Réponse: ${result}`);
    } else {
      console.log(`❌ Erreur webhook: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log(`🔍 Détails: ${error}`);
    }
  } catch (error) {
    console.log(`💥 Erreur de connexion: ${error.message}`);
  }
  
  // Délai entre les tests
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function runAllTests() {
  console.log('🚀 Démarrage des tests d\'intégration WhatsApp + GPT-4o');
  console.log(`🔗 URL du webhook: ${WEBHOOK_URL}`);
  console.log('=' * 60);
  
  for (const testMessage of testMessages) {
    await testWebhook(testMessage);
  }
  
  console.log('\n🏁 Tests terminés');
  console.log('📋 Vérifiez les logs du serveur webhook et la base de données pour voir les analyses.');
}

// Exécution des tests
runAllTests().catch(console.error);