#!/usr/bin/env node

// Test du webhook WhatsApp pour vérification Meta
import fetch from 'node-fetch';

const WEBHOOK_URL = 'https://air-host-central-contactpolarisi.replit.app/webhook/whatsapp';
const VERIFY_TOKEN = 'airhost_webhook_verify_2024';

async function testWebhookVerification() {
  console.log('🔍 Test de vérification du webhook Meta...');
  
  try {
    // Simuler la requête de vérification de Meta
    const verifyUrl = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test_challenge_123`;
    
    console.log(`📡 URL de test: ${verifyUrl}`);
    
    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'facebookexternalua'
      }
    });
    
    const responseText = await response.text();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📝 Réponse: ${responseText}`);
    
    if (response.status === 200 && responseText === 'test_challenge_123') {
      console.log('✅ Webhook vérifié avec succès - Prêt pour Meta!');
      return true;
    } else {
      console.log('❌ Échec de la vérification du webhook');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    return false;
  }
}

async function testWebhookStatus() {
  console.log('\n🔍 Test du statut du webhook...');
  
  try {
    const statusUrl = 'https://air-host-central-contactpolarisi.replit.app/test-webhook';
    const response = await fetch(statusUrl);
    const data = await response.json();
    
    console.log('📊 Statut du proxy:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Erreur lors du test de statut:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Tests de configuration webhook WhatsApp Meta\n');
  
  await testWebhookStatus();
  await testWebhookVerification();
  
  console.log('\n📋 Configuration pour Meta:');
  console.log(`URL de rappel: ${WEBHOOK_URL}`);
  console.log(`Token de vérification: ${VERIFY_TOKEN}`);
  console.log('\n🎯 Instructions:');
  console.log('1. Copiez l\'URL de rappel dans le champ "URL de rappel" de Meta');
  console.log('2. Copiez le token dans le champ "Vérifier le token"');
  console.log('3. Cliquez sur "Vérifier et enregistrer"');
}

runTests();