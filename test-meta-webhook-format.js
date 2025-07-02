#!/usr/bin/env node

import fetch from 'node-fetch';

// Test avec le format exact de Meta que vous avez reçu
const metaTestPayload = {
  "field": "messages",
  "value": {
    "messaging_product": "whatsapp",
    "metadata": {
      "display_phone_number": "16505551111",
      "phone_number_id": "123456123"
    },
    "contacts": [
      {
        "profile": {
          "name": "test user name"
        },
        "wa_id": "16315551181"
      }
    ],
    "messages": [
      {
        "from": "16315551181",
        "id": "ABGGFlA5Fpa",
        "timestamp": "1504902988",
        "type": "text",
        "text": {
          "body": "this is a text message"
        }
      }
    ]
  }
};

async function testMetaWebhook() {
  console.log('Test du webhook avec le format Meta exact...');
  
  try {
    const response = await fetch('http://localhost:3001/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaTestPayload)
    });
    
    const responseText = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Réponse: ${responseText}`);
    
    if (response.status === 200) {
      console.log('✅ Webhook a traité le message avec succès!');
    } else {
      console.log('❌ Erreur dans le traitement du webhook');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Test également avec un message en français
const frenchTestPayload = {
  "field": "messages",
  "value": {
    "messaging_product": "whatsapp",
    "metadata": {
      "display_phone_number": "15550104726",
      "phone_number_id": "123456123"
    },
    "contacts": [
      {
        "profile": {
          "name": "Client Test"
        },
        "wa_id": "33617370484"
      }
    ],
    "messages": [
      {
        "from": "33617370484",
        "id": "test123",
        "timestamp": Date.now().toString(),
        "type": "text",
        "text": {
          "body": "Bonjour, il y a une fuite d'eau dans la salle de bain, c'est urgent!"
        }
      }
    ]
  }
};

async function testFrenchMessage() {
  console.log('\nTest avec message français d\'urgence...');
  
  try {
    const response = await fetch('http://localhost:3001/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(frenchTestPayload)
    });
    
    const responseText = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Réponse: ${responseText}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du test français:', error.message);
  }
}

async function runTests() {
  await testMetaWebhook();
  await testFrenchMessage();
  
  console.log('\n📋 Après ces tests, vérifiez:');
  console.log('1. Les logs du webhook WhatsApp');
  console.log('2. Que les messages apparaissent dans votre interface');
  console.log('3. Que les tags d\'analyse sont corrects');
}

runTests();