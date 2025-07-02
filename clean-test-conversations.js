/**
 * Nettoyage des conversations de test pour préparer le test final
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function cleanTestConversations() {
  console.log('🧹 Nettoyage des conversations de test...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Supprimer les conversations de test
    const testNames = [
      'Test Edge Function Final',
      'Test Debug Config', 
      'Test Edge Function Fixed',
      'Test Zapier Debug',
      'Premier Test Après Nettoyage',
      'Test Integration Zapier',
      'Test Edge Function Zapier',
      'un autre test nnnn'
    ];

    for (const name of testNames) {
      const { error } = await devClient
        .from('conversations')
        .delete()
        .eq('guest_name', name);

      if (error) {
        console.log(`Erreur suppression ${name}:`, error.message);
      } else {
        console.log(`✅ Supprimé: ${name}`);
      }
    }

    // Supprimer aussi les messages associés si nécessaire
    const { error: messagesError } = await devClient
      .from('messages')
      .delete()
      .in('conversation_id', [
        'db86411c-9ce5-4c08-b01a-1487b698b738',
        '4b9693fc-0248-4809-9df5-ce6f3a6d6388',
        '4e7e9a97-d26a-4cc7-8378-e958d2e7d0b1',
        'a7e51e98-3079-4961-89be-150bc19da77c',
        '70c31394-559d-4290-b271-7c09ed19c00b',
        'fa316ab4-c376-4227-b823-2c9fb1e9ae2f',
        'd3a948f0-7f23-4bbf-a264-7864c499f9dd',
        'b32aea59-cd2d-4833-a798-87b0b41eb676'
      ]);

    console.log('🎉 Nettoyage terminé, prêt pour le test final !');

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

cleanTestConversations();