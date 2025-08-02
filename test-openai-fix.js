#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Configuration des variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

// Test de l'API OpenAI
async function testOpenAI() {
  console.log('🔑 Test de la clé API OpenAI...');
  
  const apiKey = process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ VITE_OPENAI_API_KEY manquante');
    return false;
  }
  
  console.log('✅ Clé API trouvée:', apiKey.substring(0, 20) + '...');
  
  try {
    // Test simple d'appel API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Tu es un assistant de test.' },
          { role: 'user', content: 'Réponds simplement "Test réussi"' }
        ],
        max_tokens: 10
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur API OpenAI:', response.status, errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Réponse OpenAI:', data.choices[0]?.message?.content || 'Pas de réponse');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test OpenAI:', error.message);
    return false;
  }
}

// Test du service d'analyse de conversation
async function testConversationAnalysis() {
  console.log('\n🧠 Test du service d\'analyse de conversation...');
  
  try {
    // Import dynamique du service d'analyse
    const { conversationAnalysis } = await import('./src/services/conversation-analysis.ts');
    
    const testMessages = [
      { content: 'Bonjour, il y a un problème urgent avec le chauffage !', direction: 'inbound' }
    ];
    
    console.log('📝 Test d\'analyse avec message:', testMessages[0].content);
    
    const analysis = await conversationAnalysis.analyzeConversation(testMessages);
    console.log('✅ Analyse terminée:');
    console.log('   - Tag:', analysis.conversationTag);
    console.log('   - Priorité:', analysis.priority);
    console.log('   - Confiance:', analysis.confidence);
    console.log('   - Explication:', analysis.explanation);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'analyse:', error.message);
    return false;
  }
}

// Test de génération de réponse
async function testResponseGeneration() {
  console.log('\n💬 Test de génération de réponse...');
  
  try {
    const { conversationAnalysis } = await import('./src/services/conversation-analysis.ts');
    
    const testMessages = [
      { content: 'Bonjour ! Comment accéder au WiFi ?', direction: 'inbound' }
    ];
    
    console.log('📝 Test de génération avec message:', testMessages[0].content);
    
    const response = await conversationAnalysis.generateAIResponse(testMessages);
    console.log('✅ Réponse générée:');
    console.log('   - Réponse:', response.response);
    console.log('   - Confiance:', response.confidence);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test de génération:', error.message);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('🚀 Test des modifications OpenAI et analyse IA unifiée\n');
  
  const tests = [
    { name: 'API OpenAI', fn: testOpenAI },
    { name: 'Analyse de conversation', fn: testConversationAnalysis },
    { name: 'Génération de réponse', fn: testResponseGeneration }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    console.log(`\n--- Test: ${test.name} ---`);
    try {
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name}: RÉUSSI`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: ÉCHOUÉ`);
      }
    } catch (error) {
      console.error(`❌ ${test.name}: ERREUR -`, error.message);
    }
  }
  
  console.log(`\n🎯 Résultat final: ${passed}/${total} tests réussis`);
  
  if (passed === total) {
    console.log('🎉 Tous les tests sont réussis ! La correction OpenAI fonctionne.');
  } else {
    console.log('⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
  }
}

main().catch(console.error);