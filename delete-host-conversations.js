// Script pour supprimer toutes les conversations d'un hôte spécifique
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// ID de l'hôte dont les conversations doivent être supprimées (peut être passé en argument CLI)
const HOST_ID = process.argv[2] || '471eca7b-7628-4ba1-a454-81dd60ae47bf';

async function deleteHostConversations() {
  console.log(`🔍 Recherche des propriétés appartenant à l'hôte ${HOST_ID}...`);
  
  try {
    // 1. Récupérer toutes les propriétés de l'hôte
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('host_id', HOST_ID);
    
    if (propertiesError) {
      throw new Error(`Erreur lors de la récupération des propriétés: ${propertiesError.message}`);
    }
    
    if (!properties || properties.length === 0) {
      console.log(`⚠️ Aucune propriété trouvée pour l'hôte ${HOST_ID}`);
      return;
    }
    
    console.log(`📊 ${properties.length} propriété(s) trouvée(s):`);
    properties.forEach(prop => console.log(`   - ${prop.name} (${prop.id})`));
    
    // 2. Récupérer les IDs des conversations liées à ces propriétés
    const propertyIds = properties.map(p => p.id);
    
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .in('property_id', propertyIds);
    
    if (conversationsError) {
      throw new Error(`Erreur lors de la récupération des conversations: ${conversationsError.message}`);
    }
    
    if (!conversations || conversations.length === 0) {
      console.log(`ℹ️ Aucune conversation trouvée pour les propriétés de l'hôte ${HOST_ID}`);
      return;
    }
    
    console.log(`\n🗑️ Suppression de ${conversations.length} conversation(s):`);
    conversations.forEach(conv => {
      const property = properties.find(p => p.id === conv.property_id);
      const propertyName = property ? property.name : 'Propriété inconnue';
      console.log(`   - Conversation avec ${conv.guest_name} (Propriété: ${propertyName})`);
    });
    
    // 3. Supprimer les messages liés à ces conversations
    const conversationIds = conversations.map(c => c.id);
    
    console.log(`\n🗑️ Suppression des messages associés...`);
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('conversation_id', conversationIds);
    
    if (messagesError) {
      throw new Error(`Erreur lors de la suppression des messages: ${messagesError.message}`);
    }
    
    // 4. Supprimer les conversations
    console.log(`🗑️ Suppression des conversations...`);
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds);
    
    if (deleteError) {
      throw new Error(`Erreur lors de la suppression des conversations: ${deleteError.message}`);
    }
    
    console.log(`\n✅ Suppression terminée avec succès!`);
    console.log(`   - ${conversations.length} conversation(s) supprimée(s)`);
    console.log(`   - Messages associés supprimés`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution du script:`, error);
  }
}

// Exécuter la fonction principale
deleteHostConversations();
