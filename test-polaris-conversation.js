#!/usr/bin/env node

import fetch from 'node-fetch';

async function testPolarisConversation() {
  console.log('🧪 Test conversation Contact Polaris IA\n');

  // Envoyer un message spécifique pour vérifier l'affichage
  const testMessage = {
    field: 'messages',
    value: {
      messaging_product: 'whatsapp',
      metadata: {
        display_phone_number: '15550104726',
        phone_number_id: '123456789'
      },
      contacts: [{
        profile: { name: 'Contact Polaris IA' },
        wa_id: '33617370484'
      }],
      messages: [{
        from: '33617370484',
        id: `msg_polaris_${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: 'text',
        text: {
          body: 'Test d\'affichage - Ce message devrait apparaître dans la conversation Contact Polaris IA'
        }
      }]
    }
  };

  try {
    const response = await fetch('http://localhost:3001/webhook/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });

    const result = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Réponse: ${result}`);

    if (response.status === 200) {
      console.log('\n✅ Message envoyé avec succès');
      console.log('📱 Vérifiez votre interface sur http://localhost:5001');
      console.log('🔍 La conversation "Contact Polaris IA" devrait être en premier');
      console.log('📝 Avec le message: "Test d\'affichage - Ce message devrait..."');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testPolarisConversation();