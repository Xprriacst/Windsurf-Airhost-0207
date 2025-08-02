// Script pour supprimer complètement toutes les conversations d'un hôte spécifique
// Utilise les variables d'environnement du fichier .env.local
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase avec les bonnes variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes!');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? 'Présente' : 'Manquante');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Présente' : 'Manquante');
  process.exit(1);
}

// Créer le client Supabase avec les privilèges service_role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ID de l'hôte dont les conversations doivent être supprimées
const HOST_ID = process.argv[2] || 'ccb6fe09-a88a-4de3-9050-f9162ba6c28d';

console.log('🔧 Configuration:');
console.log('   URL Supabase:', supabaseUrl);
console.log('   Clé service:', supabaseServiceKey.substring(0, 30) + '...');
console.log('   ID Hôte:', HOST_ID);

async function deleteHostConversationsComplete() {
  console.log(`\n🔍 Suppression complète des conversations pour l'hôte ${HOST_ID}...`);
  
  try {
    // 1. Vérifier si l'hôte existe
    const { data: hostData, error: hostError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', HOST_ID)
      .maybeSingle();
    
    if (hostError) {
      console.log(`⚠️ Erreur lors de la vérification de l'hôte: ${hostError.message}`);
    }
    
    if (!hostData) {
      console.log(`⚠️ Aucun utilisateur trouvé avec l'ID ${HOST_ID}`);
      console.log(`Poursuite de la suppression si des données existent...`);
    } else {
      console.log(`✓ Hôte trouvé: ${hostData.email || 'Email non disponible'}`);
    }
    
    // 2. Rechercher toutes les propriétés de l'hôte
    console.log(`\n🏠 Recherche des propriétés appartenant à l'hôte...`);
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('host_id', HOST_ID);
    
    if (propertiesError) {
      console.log(`⚠️ Erreur lors de la recherche des propriétés: ${propertiesError.message}`);
    }
    
    let propertyIds = [];
    if (properties && properties.length > 0) {
      propertyIds = properties.map(p => p.id);
      console.log(`✓ ${properties.length} propriété(s) trouvée(s):`);
      properties.forEach(prop => console.log(`   - ${prop.name} (${prop.id})`));
    } else {
      console.log(`ℹ️ Aucune propriété trouvée pour l'hôte ${HOST_ID}`);
    }
    
    // 3. Rechercher toutes les conversations liées aux propriétés
    let allConversationIds = [];
    
    if (propertyIds.length > 0) {
      console.log(`\n💬 Recherche des conversations liées aux propriétés...`);
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, guest_name, property_id')
        .in('property_id', propertyIds);
      
      if (conversationsError) {
        console.log(`⚠️ Erreur lors de la recherche des conversations: ${conversationsError.message}`);
      } else if (conversations && conversations.length > 0) {
        allConversationIds = conversations.map(c => c.id);
        console.log(`✓ ${conversations.length} conversation(s) trouvée(s):`);
        conversations.forEach(conv => {
          const property = properties.find(p => p.id === conv.property_id);
          const propertyName = property ? property.name : 'Propriété inconnue';
          console.log(`   - ${conv.guest_name} (${propertyName})`);
        });
      } else {
        console.log(`ℹ️ Aucune conversation trouvée pour les propriétés de l'hôte`);
      }
    }
    
    // 4. Rechercher également les messages directement liés à l'hôte (au cas où)
    console.log(`\n📨 Recherche des messages envoyés par l'hôte...`);
    const { data: hostMessages, error: messagesError } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('host_id', HOST_ID);
    
    if (messagesError) {
      console.log(`⚠️ Erreur lors de la recherche des messages: ${messagesError.message}`);
    } else if (hostMessages && hostMessages.length > 0) {
      const messageConversationIds = [...new Set(hostMessages.map(m => m.conversation_id))];
      // Ajouter les IDs de conversation trouvés via les messages
      allConversationIds = [...new Set([...allConversationIds, ...messageConversationIds])];
      console.log(`✓ ${hostMessages.length} message(s) trouvé(s) dans ${messageConversationIds.length} conversation(s)`);
    } else {
      console.log(`ℹ️ Aucun message trouvé pour l'hôte ${HOST_ID}`);
    }
    
    if (allConversationIds.length === 0) {
      console.log(`\n⚠️ Aucune conversation trouvée pour l'hôte ${HOST_ID}`);
      console.log(`✅ Rien à supprimer`);
      return;
    }
    
    console.log(`\n📊 Total: ${allConversationIds.length} conversation(s) à supprimer`);
    
    // 5. Supprimer les analyses de conversations
    console.log(`\n🔍 Suppression des analyses de conversations...`);
    const { data: deletedAnalyses, error: analysesError } = await supabase
      .from('conversation_analysis')
      .delete()
      .in('conversation_id', allConversationIds)
      .select('id');
    
    if (analysesError) {
      console.log(`⚠️ Erreur lors de la suppression des analyses: ${analysesError.message}`);
    } else {
      const analysesCount = deletedAnalyses ? deletedAnalyses.length : 0;
      console.log(`✓ ${analysesCount} analyse(s) supprimée(s)`);
    }
    
    // 6. Supprimer tous les messages liés aux conversations
    console.log(`\n📝 Suppression des messages...`);
    let totalMessagesDeleted = 0;
    
    for (const convId of allConversationIds) {
      const { data: deletedMessages, error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', convId)
        .select('id');
      
      if (deleteMessagesError) {
        console.log(`⚠️ Erreur lors de la suppression des messages pour la conversation ${convId}: ${deleteMessagesError.message}`);
      } else {
        const messagesCount = deletedMessages ? deletedMessages.length : 0;
        totalMessagesDeleted += messagesCount;
      }
    }
    
    console.log(`✓ ${totalMessagesDeleted} message(s) supprimé(s)`);
    
    // 7. Supprimer les conversations
    console.log(`\n💬 Suppression des conversations...`);
    let totalConversationsDeleted = 0;
    
    for (const convId of allConversationIds) {
      const { data: deletedConversation, error: deleteConvError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', convId)
        .select('id');
      
      if (deleteConvError) {
        console.log(`⚠️ Erreur lors de la suppression de la conversation ${convId}: ${deleteConvError.message}`);
      } else {
        if (deletedConversation && deletedConversation.length > 0) {
          totalConversationsDeleted++;
        }
      }
    }
    
    console.log(`✓ ${totalConversationsDeleted} conversation(s) supprimée(s)`);
    
    // 8. Optionnel: Nettoyer les configurations WhatsApp de l'hôte
    console.log(`\n📱 Nettoyage des configurations WhatsApp...`);
    const { data: deletedWhatsAppConfig, error: whatsappError } = await supabase
      .from('whatsapp_config')
      .delete()
      .eq('host_id', HOST_ID)
      .select('id');
    
    if (whatsappError) {
      console.log(`⚠️ Erreur lors de la suppression des configurations WhatsApp: ${whatsappError.message}`);
    } else {
      const whatsappCount = deletedWhatsAppConfig ? deletedWhatsAppConfig.length : 0;
      console.log(`✓ ${whatsappCount} configuration(s) WhatsApp supprimée(s)`);
    }
    
    // 9. Optionnel: Nettoyer les configurations de templates WhatsApp
    console.log(`\n📄 Nettoyage des configurations de templates WhatsApp...`);
    const { data: deletedTemplateConfig, error: templateError } = await supabase
      .from('whatsapp_template_config')
      .delete()
      .eq('host_id', HOST_ID)
      .select('id');
    
    if (templateError) {
      console.log(`⚠️ Erreur lors de la suppression des configurations de templates: ${templateError.message}`);
    } else {
      const templateCount = deletedTemplateConfig ? deletedTemplateConfig.length : 0;
      console.log(`✓ ${templateCount} configuration(s) de template supprimée(s)`);
    }
    
    // 10. Résumé final
    console.log(`\n========================================`);
    console.log(`✅ SUPPRESSION TERMINÉE AVEC SUCCÈS!`);
    console.log(`========================================`);
    console.log(`🏠 Propriétés trouvées: ${propertyIds.length}`);
    console.log(`💬 Conversations supprimées: ${totalConversationsDeleted}`);
    console.log(`📝 Messages supprimés: ${totalMessagesDeleted}`);
    console.log(`🔍 Analyses supprimées: ${deletedAnalyses ? deletedAnalyses.length : 0}`);
    console.log(`📱 Configs WhatsApp supprimées: ${deletedWhatsAppConfig ? deletedWhatsAppConfig.length : 0}`);
    console.log(`📄 Configs templates supprimées: ${deletedTemplateConfig ? deletedTemplateConfig.length : 0}`);
    console.log(`========================================`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution du script:`, error);
    process.exit(1);
  }
}

// Demander confirmation avant de procéder à la suppression
console.log(`\n⚠️  ATTENTION: Ce script va supprimer DÉFINITIVEMENT toutes les conversations de l'hôte ${HOST_ID}`);
console.log(`   Cela inclut:`);
console.log(`   - Toutes les conversations`);
console.log(`   - Tous les messages associés`);
console.log(`   - Toutes les analyses de conversations`);
console.log(`   - Les configurations WhatsApp`);
console.log(`   - Les configurations de templates`);
console.log(`\n🔒 Cette action est IRREVERSIBLE!`);

// Si exécuté avec l'argument --confirm, procéder directement
if (process.argv.includes('--confirm')) {
  deleteHostConversationsComplete();
} else {
  console.log(`\n💡 Pour confirmer la suppression, relancez le script avec:`);
  console.log(`   node delete-host-conversations-complete.js ${HOST_ID} --confirm`);
  console.log(`\n   Ou pour un autre hôte:`);
  console.log(`   node delete-host-conversations-complete.js <HOST_ID> --confirm`);
}