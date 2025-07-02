/**
 * Test pour forcer une nouvelle conversation et envoi de template
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function forceNewConversationTest() {
  console.log('🔄 Suppression et recréation conversation pour test template...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Supprimer la conversation existante pour +33617370484
    const { error: deleteError } = await devClient
      .from('conversations')
      .delete()
      .eq('guest_phone', '+33617370484');

    if (deleteError) {
      console.log('Erreur suppression:', deleteError.message);
    } else {
      console.log('✅ Conversation supprimée pour +33617370484');
    }

    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Maintenant tester la création avec le service local
    console.log('🚀 Test création nouvelle conversation...');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

forceNewConversationTest();