/**
 * Nettoyage final des conversations de test avant production
 * Supprime toutes les conversations de test créées durant les validations
 */

import { createClient } from '@supabase/supabase-js';

async function cleanTestConversations() {
  console.log('🧹 Nettoyage final des conversations de test...');

  // Utiliser les variables d'environnement
  const supabaseUrl = process.env.DEV_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Lister les conversations de test
    const testPatterns = [
      'Test%',
      'moi%',
      'ana%'
    ];

    console.log('📋 Récupération des conversations de test...');
    
    let allTestConversations = [];
    
    for (const pattern of testPatterns) {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, guest_name, guest_phone, created_at')
        .ilike('guest_name', pattern)
        .eq('host_id', 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7');

      if (error) {
        console.error(`❌ Erreur lors de la recherche pattern "${pattern}":`, error);
        continue;
      }

      if (conversations && conversations.length > 0) {
        allTestConversations = allTestConversations.concat(conversations);
        console.log(`🔍 Pattern "${pattern}": ${conversations.length} conversations trouvées`);
      }
    }

    if (allTestConversations.length === 0) {
      console.log('✅ Aucune conversation de test trouvée');
      return;
    }

    console.log(`\n📊 Total conversations de test trouvées: ${allTestConversations.length}`);
    
    // Afficher la liste
    allTestConversations.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.guest_name} (${conv.guest_phone}) - ${conv.created_at}`);
    });

    // Supprimer les messages associés d'abord
    console.log('\n🗑️  Suppression des messages associés...');
    const conversationIds = allTestConversations.map(c => c.id);
    
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('conversation_id', conversationIds);

    if (messagesError) {
      console.error('❌ Erreur lors de la suppression des messages:', messagesError);
    } else {
      console.log('✅ Messages supprimés avec succès');
    }

    // Supprimer les conversations
    console.log('🗑️  Suppression des conversations...');
    
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds);

    if (conversationsError) {
      console.error('❌ Erreur lors de la suppression des conversations:', conversationsError);
    } else {
      console.log(`✅ ${allTestConversations.length} conversations de test supprimées avec succès`);
    }

    console.log('\n🎯 Système nettoyé et prêt pour production !');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter si appelé directement
cleanTestConversations();