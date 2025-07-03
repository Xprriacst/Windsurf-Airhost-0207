// Script pour supprimer toutes les conversations d'un hôte spécifique
// Cette version recherche directement les conversations liées à l'hôte
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// ID de l'hôte dont les conversations doivent être supprimées
const HOST_ID = '471eca7b-7628-4ba1-a454-81dd60ae47bf';

async function deleteHostConversations() {
  console.log(`🔍 Recherche des conversations liées à l'hôte ${HOST_ID}...`);
  
  try {
    // 1. Vérifier si l'hôte existe
    const { data: hostData, error: hostError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', HOST_ID)
      .single();
    
    if (hostError && hostError.code !== 'PGRST116') {
      throw new Error(`Erreur lors de la vérification de l'hôte: ${hostError.message}`);
    }
    
    if (!hostData) {
      console.log(`⚠️ Aucun utilisateur trouvé avec l'ID ${HOST_ID}`);
      console.log(`Tentative de recherche de conversations directement...`);
    } else {
      console.log(`✓ Hôte trouvé: ${hostData.email || 'Email non disponible'}`);
    }
    
    // 2. Méthode 1: Rechercher les conversations via les messages
    console.log(`\n🔎 Recherche des messages envoyés par l'hôte...`);
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('host_id', HOST_ID)
      .distinct();
    
    if (messagesError) {
      console.log(`⚠️ Erreur lors de la recherche des messages: ${messagesError.message}`);
    }
    
    let conversationIds = [];
    if (messages && messages.length > 0) {
      conversationIds = messages.map(m => m.conversation_id);
      console.log(`✓ ${messages.length} conversation(s) trouvée(s) via les messages`);
    } else {
      console.log(`ℹ️ Aucun message trouvé pour l'hôte ${HOST_ID}`);
    }
    
    // 3. Méthode 2: Rechercher les conversations via les propriétés
    console.log(`\n🔎 Recherche des propriétés appartenant à l'hôte...`);
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('host_id', HOST_ID);
    
    if (propertiesError) {
      console.log(`⚠️ Erreur lors de la recherche des propriétés: ${propertiesError.message}`);
    }
    
    let propertyConversationIds = [];
    if (properties && properties.length > 0) {
      console.log(`✓ ${properties.length} propriété(s) trouvée(s):`);
      properties.forEach(prop => console.log(`   - ${prop.name} (${prop.id})`));
      
      const propertyIds = properties.map(p => p.id);
      const { data: propConversations, error: propConvError } = await supabase
        .from('conversations')
        .select('id')
        .in('property_id', propertyIds);
      
      if (propConvError) {
        console.log(`⚠️ Erreur lors de la recherche des conversations par propriété: ${propConvError.message}`);
      } else if (propConversations && propConversations.length > 0) {
        propertyConversationIds = propConversations.map(c => c.id);
        console.log(`✓ ${propConversations.length} conversation(s) trouvée(s) via les propriétés`);
      } else {
        console.log(`ℹ️ Aucune conversation trouvée pour les propriétés de l'hôte`);
      }
    } else {
      console.log(`ℹ️ Aucune propriété trouvée pour l'hôte ${HOST_ID}`);
    }
    
    // 4. Combiner les résultats des deux méthodes
    const allConversationIds = [...new Set([...conversationIds, ...propertyConversationIds])];
    
    if (allConversationIds.length === 0) {
      console.log(`\n⚠️ Aucune conversation trouvée pour l'hôte ${HOST_ID}`);
      return;
    }
    
    console.log(`\n📊 Total: ${allConversationIds.length} conversation(s) à supprimer`);
    
    // 5. Récupérer les détails des conversations pour affichage
    const { data: conversationsDetails, error: convDetailsError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .in('id', allConversationIds);
    
    if (convDetailsError) {
      console.log(`⚠️ Erreur lors de la récupération des détails des conversations: ${convDetailsError.message}`);
    } else if (conversationsDetails && conversationsDetails.length > 0) {
      console.log(`\n🗑️ Conversations à supprimer:`);
      conversationsDetails.forEach(conv => {
        console.log(`   - ID: ${conv.id}, Invité: ${conv.guest_name}, Propriété: ${conv.property_id}`);
      });
    }
    
    // 6. Supprimer les messages liés à ces conversations
    console.log(`\n🗑️ Suppression des messages associés...`);
    const { error: deleteMessagesError } = await supabase
      .from('messages')
      .delete()
      .in('conversation_id', allConversationIds);
    
    if (deleteMessagesError) {
      throw new Error(`Erreur lors de la suppression des messages: ${deleteMessagesError.message}`);
    }
    
    // 7. Supprimer les conversations
    console.log(`🗑️ Suppression des conversations...`);
    const { error: deleteConvError } = await supabase
      .from('conversations')
      .delete()
      .in('id', allConversationIds);
    
    if (deleteConvError) {
      throw new Error(`Erreur lors de la suppression des conversations: ${deleteConvError.message}`);
    }
    
    console.log(`\n✅ Suppression terminée avec succès!`);
    console.log(`   - ${allConversationIds.length} conversation(s) supprimée(s)`);
    console.log(`   - Messages associés supprimés`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution du script:`, error);
  }
}

// Exécuter la fonction principale
deleteHostConversations();
