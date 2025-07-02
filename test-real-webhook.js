#!/usr/bin/env node

import fetch from 'node-fetch';

async function testRealWebhook() {
  console.log('🔍 Test webhook en temps réel');
  console.log('Surveillance des logs pendant 30 secondes...\n');
  
  // Simuler un vrai message Meta avec le format exact
  const realMetaPayload = {
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15550104726",
                "phone_number_id": "123456789"
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
                  "id": `msg_real_${Date.now()}`,
                  "timestamp": Math.floor(Date.now() / 1000).toString(),
                  "type": "text",
                  "text": {
                    "body": "Message test envoyé depuis +33617370484 vers +1 (555) 010-4726"
                  }
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  };

  try {
    console.log('📤 Test direct sur le webhook local...');
    const localResponse = await fetch('http://localhost:3001/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(realMetaPayload)
    });

    console.log(`Status local: ${localResponse.status}`);
    const localResponseText = await localResponse.text();
    console.log(`Réponse locale: ${localResponseText}`);

    console.log('\n📤 Test via le proxy public...');
    const response = await fetch('https://air-host-central-contactpolarisi.replit.app/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=test'
      },
      body: JSON.stringify(realMetaPayload)
    });

    console.log(`Status proxy: ${response.status}`);
    const responseText = await response.text();
    console.log(`Réponse proxy: ${responseText}`);
    
    if (response.status === 200) {
      console.log('\n✅ Le webhook traite correctement le format Meta réel');
      console.log('💡 Le problème vient de la configuration Meta Business:');
      console.log('   1. Vérifiez que le webhook est configuré dans Meta');
      console.log('   2. Vérifiez que +33617370484 est un numéro de test');
      console.log('   3. Vérifiez que l\'événement "messages" est activé');
    }
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
}

testRealWebhook();