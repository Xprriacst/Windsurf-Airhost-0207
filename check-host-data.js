// Script pour vérifier les données d'un hôte spécifique avant suppression
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase avec les bonnes variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes!');
  process.exit(1);
}

// Créer le client Supabase avec les privilèges service_role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ID de l'hôte à vérifier
const HOST_ID = process.argv[2] || 'ccb6fe09-a88a-4de3-9050-f9162ba6c28d';

async function checkHostData() {
  console.log(`\n🔍 Vérification des données pour l'hôte ${HOST_ID}...`);
  
  try {
    // 1. Vérifier le profil de l'hôte
    console.log(`\n👤 Profil de l'hôte:`);
    const { data: hostData, error: hostError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .eq('id', HOST_ID)
      .maybeSingle();
    
    if (hostError) {
      console.log(`⚠️ Erreur: ${hostError.message}`);
    } else if (hostData) {
      console.log(`✓ Email: ${hostData.email}`);
      console.log(`✓ Créé le: ${hostData.created_at}`);
    } else {
      console.log(`⚠️ Aucun profil trouvé`);
    }
    
    // 2. Propriétés de l'hôte
    console.log(`\n🏠 Propriétés:`);
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, created_at')
      .eq('host_id', HOST_ID);
    
    if (propertiesError) {
      console.log(`⚠️ Erreur: ${propertiesError.message}`);
    } else if (properties && properties.length > 0) {
      console.log(`✓ ${properties.length} propriété(s) trouvée(s):`);
      properties.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.name} (${prop.id})`);
        console.log(`      Créée le: ${prop.created_at}`);
      });
    } else {
      console.log(`ℹ️ Aucune propriété trouvée`);
    }
    
    // 3. Conversations liées aux propriétés
    if (properties && properties.length > 0) {
      console.log(`\n💬 Conversations:`);
      const propertyIds = properties.map(p => p.id);
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, guest_name, guest_phone, property_id, created_at, last_message_at')
        .in('property_id', propertyIds);
      
      if (conversationsError) {
        console.log(`⚠️ Erreur: ${conversationsError.message}`);
      } else if (conversations && conversations.length > 0) {
        console.log(`✓ ${conversations.length} conversation(s) trouvée(s):`);
        conversations.forEach((conv, index) => {
          const property = properties.find(p => p.id === conv.property_id);
          console.log(`   ${index + 1}. ${conv.guest_name} (${conv.guest_phone})`);
          console.log(`      Propriété: ${property ? property.name : 'Inconnue'}`);
          console.log(`      Créée: ${conv.created_at}`);
          console.log(`      Dernier message: ${conv.last_message_at}`);
        });
        
        // 4. Messages dans ces conversations
        console.log(`\n📝 Messages:`);
        const conversationIds = conversations.map(c => c.id);
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, conversation_id, content, created_at')
          .in('conversation_id', conversationIds);
        
        if (messagesError) {
          console.log(`⚠️ Erreur: ${messagesError.message}`);
        } else if (messages && messages.length > 0) {
          console.log(`✓ ${messages.length} message(s) trouvé(s)`);
          
          // Grouper par conversation
          const messagesByConv = messages.reduce((acc, msg) => {
            if (!acc[msg.conversation_id]) acc[msg.conversation_id] = [];
            acc[msg.conversation_id].push(msg);
            return acc;
          }, {});
          
          Object.entries(messagesByConv).forEach(([convId, convMessages]) => {
            const conv = conversations.find(c => c.id === convId);
            console.log(`   Conversation ${conv ? conv.guest_name : convId}: ${convMessages.length} message(s)`);
          });
        } else {
          console.log(`ℹ️ Aucun message trouvé`);
        }
        
        // 5. Analyses de conversations
        console.log(`\n🔍 Analyses de conversations:`);
        const { data: analyses, error: analysesError } = await supabase
          .from('conversation_analysis')
          .select('id, conversation_id, analysis_tag, needs_attention, created_at')
          .in('conversation_id', conversationIds);
        
        if (analysesError) {
          console.log(`⚠️ Erreur: ${analysesError.message}`);
        } else if (analyses && analyses.length > 0) {
          console.log(`✓ ${analyses.length} analyse(s) trouvée(s):`);
          analyses.forEach((analysis, index) => {
            console.log(`   ${index + 1}. Tag: ${analysis.analysis_tag}`);
            console.log(`      Attention: ${analysis.needs_attention ? 'Oui' : 'Non'}`);
            console.log(`      Créée: ${analysis.created_at}`);
          });
        } else {
          console.log(`ℹ️ Aucune analyse trouvée`);
        }
      } else {
        console.log(`ℹ️ Aucune conversation trouvée`);
      }
    }
    
    // 6. Messages directs de l'hôte (au cas où)
    console.log(`\n📨 Messages directs de l'hôte:`);
    const { data: hostMessages, error: hostMessagesError } = await supabase
      .from('messages')
      .select('id, conversation_id, content, created_at')
      .eq('host_id', HOST_ID);
    
    if (hostMessagesError) {
      console.log(`⚠️ Erreur: ${hostMessagesError.message}`);
    } else if (hostMessages && hostMessages.length > 0) {
      console.log(`✓ ${hostMessages.length} message(s) direct(s) trouvé(s)`);
    } else {
      console.log(`ℹ️ Aucun message direct trouvé`);
    }
    
    // 7. Configurations WhatsApp
    console.log(`\n📱 Configurations WhatsApp:`);
    const { data: whatsappConfig, error: whatsappError } = await supabase
      .from('whatsapp_config')
      .select('id, phone_number, access_token, created_at')
      .eq('host_id', HOST_ID);
    
    if (whatsappError) {
      console.log(`⚠️ Erreur: ${whatsappError.message}`);
    } else if (whatsappConfig && whatsappConfig.length > 0) {
      console.log(`✓ ${whatsappConfig.length} configuration(s) WhatsApp trouvée(s):`);
      whatsappConfig.forEach((config, index) => {
        console.log(`   ${index + 1}. Numéro: ${config.phone_number}`);
        console.log(`      Token: ${config.access_token ? 'Présent' : 'Absent'}`);
        console.log(`      Créée: ${config.created_at}`);
      });
    } else {
      console.log(`ℹ️ Aucune configuration WhatsApp trouvée`);
    }
    
    // 8. Configurations de templates
    console.log(`\n📄 Configurations de templates:`);
    const { data: templateConfig, error: templateError } = await supabase
      .from('whatsapp_template_config')
      .select('id, property_id, template_enabled, created_at')
      .eq('host_id', HOST_ID);
    
    if (templateError) {
      console.log(`⚠️ Erreur: ${templateError.message}`);
    } else if (templateConfig && templateConfig.length > 0) {
      console.log(`✓ ${templateConfig.length} configuration(s) de template trouvée(s):`);
      templateConfig.forEach((config, index) => {
        console.log(`   ${index + 1}. Propriété ID: ${config.property_id}`);
        console.log(`      Template activé: ${config.template_enabled ? 'Oui' : 'Non'}`);
        console.log(`      Créée: ${config.created_at}`);
      });
    } else {
      console.log(`ℹ️ Aucune configuration de template trouvée`);
    }
    
    console.log(`\n========================================`);
    console.log(`✅ VÉRIFICATION TERMINÉE`);
    console.log(`========================================`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification:`, error);
  }
}

checkHostData();