// Script pour supprimer toutes les conversations de l'hôte a2ce1797-a5ab-4c37-9512-4a4058e0f1c7
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
const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function deleteHostConversations() {
  console.log(`🗑️ SUPPRESSION DES CONVERSATIONS DE L'HÔTE ${HOST_ID}`);
  console.log('=================================================================');
  
  try {
    // 1. Récupérer les conversations liées à cet hôte
    console.log(`\n🔍 Recherche des conversations...`);
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        guest_phone,
        property_id,
        property:properties!inner(name, host_id)
      `)
      .eq('property.host_id', HOST_ID);
    
    if (convError) {
      throw new Error(`Erreur lors de la recherche des conversations: ${convError.message}`);
    }
    
    if (!conversations || conversations.length === 0) {
      console.log(`⚠️ Aucune conversation trouvée pour l'hôte ${HOST_ID}`);
      return;
    }
    
    console.log(`✓ ${conversations.length} conversation(s) trouvée(s):`);
    conversations.forEach((conv, index) => {
      console.log(`   ${index + 1}. ${conv.guest_name} (${conv.guest_phone})`);
      console.log(`      ID: ${conv.id}`);
      console.log(`      Propriété: ${conv.property ? conv.property.name : 'Inconnue'}`);
    });
    
    const conversationIds = conversations.map(c => c.id);
    
    // 2. Supprimer les messages associés
    console.log(`\n🗑️ Suppression des messages associés...`);
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('conversation_id', conversationIds);
    
    if (messagesError) {
      console.log(`⚠️ Erreur lors de la suppression des messages: ${messagesError.message}`);
    } else {
      console.log(`✓ Messages supprimés avec succès`);
    }
    
    // 3. Supprimer les conversations
    console.log(`🗑️ Suppression des conversations...`);
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds);
    
    if (deleteError) {
      throw new Error(`Erreur lors de la suppression des conversations: ${deleteError.message}`);
    }
    
    console.log(`\n✅ SUPPRESSION TERMINÉE AVEC SUCCÈS !`);
    console.log(`   - ${conversations.length} conversation(s) supprimée(s)`);
    console.log(`   - Messages associés supprimés`);
    console.log(`   - Hôte concerné: ${HOST_ID}`);
    
    // 4. Vérification finale
    console.log(`\n🔍 Vérification finale...`);
    const { data: remainingConversations, error: verifyError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property:properties!inner(host_id)
      `)
      .eq('property.host_id', HOST_ID);
    
    if (verifyError) {
      console.log(`⚠️ Erreur lors de la vérification: ${verifyError.message}`);
    } else if (remainingConversations && remainingConversations.length > 0) {
      console.log(`⚠️ ${remainingConversations.length} conversation(s) restante(s) trouvée(s)`);
    } else {
      console.log(`✅ Aucune conversation restante pour cet hôte`);
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution:`, error);
  }
}

// Exécuter la suppression
deleteHostConversations();
