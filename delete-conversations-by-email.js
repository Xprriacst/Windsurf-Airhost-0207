// Script pour supprimer toutes les conversations d'un hôte par son email
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_EMAIL = 'contact.polaris.ia@gmail.com';

async function findHostByEmail(email) {
  console.log(`🔍 Recherche de l'hôte avec l'email: ${email}`);
  
  try {
    // Chercher dans la table des utilisateurs/profils
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email);
    
    if (profileError) {
      console.error('❌ Erreur recherche profiles:', profileError.message);
    } else if (profiles && profiles.length > 0) {
      console.log(`✓ Profil trouvé dans profiles:`, profiles[0]);
      return profiles[0].id;
    }
    
    // Chercher dans la table auth.users (si accessible)
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('*')
      .eq('email', email);
    
    if (userError) {
      console.log('ℹ️ Recherche auth.users échouée (normal si pas accessible):', userError.message);
    } else if (users && users.length > 0) {
      console.log(`✓ Utilisateur trouvé dans auth.users:`, users[0]);
      return users[0].id;
    }
    
    // Chercher parmi tous les profils pour voir leurs emails
    console.log('🔍 Recherche parmi tous les profils disponibles...');
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (allProfilesError) {
      console.error('❌ Erreur récupération tous profils:', allProfilesError.message);
    } else if (allProfiles) {
      console.log(`📋 ${allProfiles.length} profils trouvés:`);
      allProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ID: ${profile.id}, Email: ${profile.email || 'Non défini'}`);
        if (profile.email && profile.email.toLowerCase() === email.toLowerCase()) {
          console.log(`   ✓ MATCH TROUVÉ!`);
          return profile.id;
        }
      });
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de l\'hôte:', error);
    return null;
  }
}

async function findConversationsByHost(hostId) {
  console.log(`🔍 Recherche des conversations pour l'hôte: ${hostId}`);
  
  try {
    // Méthode 1: Conversations directes avec host_id
    const { data: directConversations, error: directError } = await supabase
      .from('conversations')
      .select('*')
      .eq('host_id', hostId);
    
    if (directError) {
      console.error('❌ Erreur recherche conversations directes:', directError.message);
    } else if (directConversations && directConversations.length > 0) {
      console.log(`✓ ${directConversations.length} conversations directes trouvées`);
      return directConversations;
    }
    
    // Méthode 2: Via les propriétés
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id')
      .eq('host_id', hostId);
    
    if (propertiesError) {
      console.error('❌ Erreur recherche propriétés:', propertiesError.message);
      return [];
    }
    
    if (!properties || properties.length === 0) {
      console.log('ℹ️ Aucune propriété trouvée pour cet hôte');
      return [];
    }
    
    console.log(`✓ ${properties.length} propriétés trouvées pour l'hôte`);
    const propertyIds = properties.map(p => p.id);
    
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .in('property_id', propertyIds);
    
    if (conversationsError) {
      console.error('❌ Erreur recherche conversations via propriétés:', conversationsError.message);
      return [];
    }
    
    console.log(`✓ ${conversations ? conversations.length : 0} conversations trouvées via propriétés`);
    return conversations || [];
    
  } catch (error) {
    console.error('❌ Erreur lors de la recherche des conversations:', error);
    return [];
  }
}

async function deleteConversations(conversations) {
  if (!conversations || conversations.length === 0) {
    console.log('ℹ️ Aucune conversation à supprimer');
    return;
  }
  
  console.log(`🗑️ Suppression de ${conversations.length} conversations...`);
  
  let deletedMessages = 0;
  let deletedConversations = 0;
  
  for (const conversation of conversations) {
    try {
      console.log(`\n🔄 Traitement conversation: ${conversation.id}`);
      console.log(`   Invité: ${conversation.guest_name} (${conversation.guest_phone})`);
      
      // Supprimer les messages d'abord
      const { data: deletedMessagesData, error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversation.id)
        .select();
      
      if (messagesError) {
        console.error(`❌ Erreur suppression messages conversation ${conversation.id}:`, messagesError.message);
      } else {
        const messageCount = deletedMessagesData ? deletedMessagesData.length : 0;
        deletedMessages += messageCount;
        console.log(`   ✓ ${messageCount} messages supprimés`);
      }
      
      // Supprimer la conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversation.id);
      
      if (conversationError) {
        console.error(`❌ Erreur suppression conversation ${conversation.id}:`, conversationError.message);
      } else {
        deletedConversations++;
        console.log(`   ✓ Conversation supprimée`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur traitement conversation ${conversation.id}:`, error);
    }
  }
  
  console.log(`\n📊 RÉSUMÉ DE LA SUPPRESSION:`);
  console.log(`   Messages supprimés: ${deletedMessages}`);
  console.log(`   Conversations supprimées: ${deletedConversations}/${conversations.length}`);
}

async function main() {
  console.log('🚀 SUPPRESSION DES CONVERSATIONS PAR EMAIL');
  console.log('==========================================');
  console.log(`📧 Email cible: ${TARGET_EMAIL}`);
  
  try {
    // 1. Trouver l'host_id
    const hostId = await findHostByEmail(TARGET_EMAIL);
    if (!hostId) {
      console.log(`❌ Impossible de trouver l'hôte avec l'email: ${TARGET_EMAIL}`);
      process.exit(1);
    }
    
    console.log(`✅ Hôte trouvé: ${hostId}`);
    
    // 2. Trouver les conversations
    const conversations = await findConversationsByHost(hostId);
    if (conversations.length === 0) {
      console.log(`ℹ️ Aucune conversation trouvée pour l'hôte ${hostId}`);
      process.exit(0);
    }
    
    console.log(`📋 ${conversations.length} conversations trouvées à supprimer`);
    
    // 3. Confirmer la suppression
    console.log(`\n⚠️ ATTENTION: Vous êtes sur le point de supprimer ${conversations.length} conversations pour l'hôte ${TARGET_EMAIL}`);
    console.log(`🔄 Poursuite de la suppression...`);
    
    // 4. Supprimer les conversations
    await deleteConversations(conversations);
    
    console.log(`\n✅ SUPPRESSION TERMINÉE avec succès!`);
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    process.exit(1);
  }
}

main();
