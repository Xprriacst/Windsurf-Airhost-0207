#!/usr/bin/env node

import fetch from 'node-fetch';

async function checkWebhookStatus() {
  console.log('🔍 Diagnostic du webhook WhatsApp\n');
  
  // 1. Vérifier que le webhook local est accessible
  try {
    console.log('1. Test du webhook local...');
    const localResponse = await fetch('http://localhost:3001/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=airhost_webhook_verify_2024&hub.challenge=test123');
    console.log(`   Status local: ${localResponse.status}`);
    console.log(`   Réponse: ${await localResponse.text()}`);
  } catch (error) {
    console.log(`   ❌ Erreur locale: ${error.message}`);
  }

  // 2. Vérifier que le proxy public est accessible
  try {
    console.log('\n2. Test du proxy public...');
    const publicResponse = await fetch('https://air-host-central-contactpolarisi.replit.app/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=airhost_webhook_verify_2024&hub.challenge=test456');
    console.log(`   Status public: ${publicResponse.status}`);
    console.log(`   Réponse: ${await publicResponse.text()}`);
  } catch (error) {
    console.log(`   ❌ Erreur publique: ${error.message}`);
  }

  // 3. Tester l'endpoint de test
  try {
    console.log('\n3. Test de l\'endpoint de statut...');
    const testResponse = await fetch('https://air-host-central-contactpolarisi.replit.app/test-webhook');
    const testData = await testResponse.json();
    console.log(`   Status: ${testResponse.status}`);
    console.log(`   Configuration:`, testData);
  } catch (error) {
    console.log(`   ❌ Erreur test: ${error.message}`);
  }

  console.log('\n📋 Instructions pour Meta:');
  console.log('URL de rappel: https://air-host-central-contactpolarisi.replit.app/webhook/whatsapp');
  console.log('Token de vérification: airhost_webhook_verify_2024');
  
  console.log('\n🔧 Vérifications à faire:');
  console.log('1. Le webhook Meta est-il correctement configuré ?');
  console.log('2. Les événements "messages" sont-ils activés ?');
  console.log('3. Le numéro de téléphone est-il vérifié dans Meta ?');
}

checkWebhookStatus();