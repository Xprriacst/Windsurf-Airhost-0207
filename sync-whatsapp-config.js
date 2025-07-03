// Script pour synchroniser la configuration WhatsApp avec l'interface utilisateur
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function syncWhatsAppConfig() {
  console.log('🔄 SYNCHRONISATION DE LA CONFIGURATION WHATSAPP');
  console.log('===============================================');
  console.log(`📧 Hôte: ${HOST_ID} (contact.polaris.ia@gmail.com)`);
  
  try {
    // 1. Vérifier la configuration actuelle
    console.log('\n🔍 Configuration actuelle:');
    const { data: currentConfig, error: currentError } = await supabase
      .from('whatsapp_template_config')
      .select('*')
      .eq('host_id', HOST_ID)
      .single();
    
    if (currentError) {
      console.error('❌ Erreur récupération config actuelle:', currentError.message);
      return;
    }
    
    console.log('📋 Configuration trouvée:');
    console.log(`   Send Welcome Template: ${currentConfig.send_welcome_template}`);
    console.log(`   Welcome Template Name: ${currentConfig.welcome_template_name}`);
    console.log(`   Auto Templates Enabled: ${currentConfig.auto_templates_enabled}`);
    console.log(`   Updated At: ${currentConfig.updated_at}`);
    
    // 2. Mettre à jour la configuration selon l'interface utilisateur
    console.log('\n⚙️ Mise à jour de la configuration...');
    console.log('   Interface utilisateur indique: Toggle ACTIVÉ');
    console.log('   Action: Activer auto_templates_enabled');
    
    const { error: updateError } = await supabase
      .from('whatsapp_template_config')
      .update({
        auto_templates_enabled: true,
        send_welcome_template: true,
        welcome_template_name: 'hello_world',
        updated_at: new Date().toISOString()
      })
      .eq('host_id', HOST_ID);
    
    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError.message);
      return;
    }
    
    console.log('✅ Configuration mise à jour avec succès!');
    
    // 3. Vérifier la nouvelle configuration
    console.log('\n🔍 Vérification de la nouvelle configuration:');
    const { data: newConfig, error: verifyError } = await supabase
      .from('whatsapp_template_config')
      .select('*')
      .eq('host_id', HOST_ID)
      .single();
    
    if (verifyError) {
      console.error('❌ Erreur vérification:', verifyError.message);
      return;
    }
    
    console.log('📋 Nouvelle configuration:');
    console.log(`   Send Welcome Template: ${newConfig.send_welcome_template}`);
    console.log(`   Welcome Template Name: ${newConfig.welcome_template_name}`);
    console.log(`   Auto Templates Enabled: ${newConfig.auto_templates_enabled}`);
    console.log(`   Updated At: ${newConfig.updated_at}`);
    
    // 4. Test rapide
    console.log('\n🧪 Test rapide de création de conversation...');
    
    const testPayload = {
      host_id: HOST_ID,
      guest_name: 'Test Sync Config',
      guest_phone: '+33666497372',
      property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
      check_in_date: '2025-01-25',
      check_out_date: '2025-01-27',
      status: 'active',
      send_welcome_template: true,
      welcome_template_name: 'hello_world'
    };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-conversation-with-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test réussi!');
      console.log(`   Template envoyé: ${result.welcome_template_sent}`);
      console.log(`   Erreur template: ${result.welcome_template_error || 'Aucune'}`);
      
      if (result.welcome_template_sent) {
        console.log('🎉 SUCCÈS: Le template WhatsApp s\'envoie maintenant correctement!');
      } else {
        console.log('⚠️ ATTENTION: Le template ne s\'est pas envoyé');
        if (result.welcome_template_error) {
          console.log(`   Raison: ${result.welcome_template_error}`);
        }
      }
      
      // Nettoyer la conversation de test
      if (result.conversation && result.conversation.id) {
        console.log('\n🗑️ Nettoyage de la conversation de test...');
        await supabase.from('messages').delete().eq('conversation_id', result.conversation.id);
        await supabase.from('conversations').delete().eq('id', result.conversation.id);
        console.log('✓ Conversation de test supprimée');
      }
      
    } else {
      console.error('❌ Erreur test:', result);
    }
    
    console.log('\n✅ SYNCHRONISATION TERMINÉE');
    console.log('============================');
    console.log('La configuration WhatsApp est maintenant synchronisée avec l\'interface utilisateur.');
    console.log('Les templates de bienvenue devraient s\'envoyer automatiquement pour les nouvelles conversations.');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

syncWhatsAppConfig();
