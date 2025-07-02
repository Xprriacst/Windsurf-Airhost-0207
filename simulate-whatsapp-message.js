#!/usr/bin/env node

import fetch from 'node-fetch';

// Simulation d'un message WhatsApp depuis votre numéro
const simulatedMessage = {
  "field": "messages",
  "value": {
    "messaging_product": "whatsapp",
    "metadata": {
      "display_phone_number": "15550104726",
      "phone_number_id": "123456789"
    },
    "contacts": [
      {
        "profile": {
          "name": "Utilisateur"
        },
        "wa_id": "33617370484"
      }
    ],
    "messages": [
      {
        "from": "33617370484",
        "id": `msg_${Date.now()}`,
        "timestamp": Math.floor(Date.now() / 1000).toString(),
        "type": "text",
        "text": {
          "body": "URGENT - Problème de chauffage dans l'appartement ! Il fait très froid et le système ne fonctionne plus du tout depuis ce matin. J'ai des invités qui arrivent ce soir, pouvez-vous envoyer un technicien rapidement s'il vous plaît ?"
        }
      }
    ]
  }
};

async function simulateMessage() {
  console.log('📱 Simulation d\'un message WhatsApp...');
  console.log(`De: +33617370484`);
  console.log(`Message: "${simulatedMessage.value.messages[0].text.body}"`);
  console.log();
  
  try {
    const response = await fetch('http://localhost:3001/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simulatedMessage)
    });
    
    const responseText = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Réponse: ${responseText}`);
    
    if (response.status === 200) {
      console.log('✅ Message traité avec succès!');
      console.log('🔍 Vérifiez votre interface pour voir:');
      console.log('   - La nouvelle conversation');
      console.log('   - Le tag d\'analyse automatique');
      console.log('   - Le message dans la base de données');
    } else {
      console.log('❌ Erreur dans le traitement');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

simulateMessage();