// Script pour analyser la configuration WhatsApp et diagnostiquer le bug des templates
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function analyzeWhatsAppConfig() {
  console.log('🔍 ANALYSE DE LA CONFIGURATION WHATSAPP');
  console.log('=======================================');
  
  try {
    // 1. Analyser la table whatsapp_config
    console.log('\n1. Configuration WhatsApp générale:');
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*');
    
    if (configError) {
      console.error(`❌ Erreur whatsapp_config: ${configError.message}`);
    } else if (whatsappConfig && whatsappConfig.length > 0) {
      console.log(`✓ ${whatsappConfig.length} configuration(s) trouvée(s):`);
      whatsappConfig.forEach((config, index) => {
        console.log(`   ${index + 1}. Host ID: ${config.host_id || 'Non défini'}`);
        console.log(`      Phone Number ID: ${config.phone_number_id || 'Non défini'}`);
        console.log(`      Token: ${config.token ? config.token.substring(0, 20) + '...' : 'Non défini'}`);
        console.log(`      Auto Welcome: ${config.auto_welcome_enabled || 'Non défini'}`);
        console.log(`      Welcome Template: ${config.welcome_template || 'Non défini'}`);
      });
    } else {
      console.log('❌ Aucune configuration WhatsApp trouvée');
    }
    
    // 2. Analyser la table whatsapp_template_config
    console.log('\n2. Configuration des templates WhatsApp:');
    const { data: templateConfig, error: templateError } = await supabase
      .from('whatsapp_template_config')
      .select('*');
    
    if (templateError) {
      console.error(`❌ Erreur whatsapp_template_config: ${templateError.message}`);
    } else if (templateConfig && templateConfig.length > 0) {
      console.log(`✓ ${templateConfig.length} configuration(s) de template trouvée(s):`);
      templateConfig.forEach((config, index) => {
        console.log(`   ${index + 1}. Host ID: ${config.host_id || 'Non défini'}`);
        console.log(`      Send Welcome Template: ${config.send_welcome_template}`);
        console.log(`      Welcome Template Name: ${config.welcome_template_name || 'Non défini'}`);
        console.log(`      Auto Templates Enabled: ${config.auto_templates_enabled}`);
        console.log(`      Updated At: ${config.updated_at || 'Non défini'}`);
      });
    } else {
      console.log('❌ Aucune configuration de template trouvée');
    }
    
    // 3. Recherche spécifique pour notre hôte de test
    console.log(`\n3. Configuration pour l'hôte ${HOST_ID}:`);
    
    const { data: hostTemplateConfig, error: hostTemplateError } = await supabase
      .from('whatsapp_template_config')
      .select('*')
      .eq('host_id', HOST_ID)
      .single();
    
    if (hostTemplateError) {
      console.log(`⚠️ Erreur ou pas de config template pour cet hôte: ${hostTemplateError.message}`);
    } else if (hostTemplateConfig) {
      console.log(`✓ Configuration template trouvée:`);
      console.log(`   Send Welcome Template: ${hostTemplateConfig.send_welcome_template}`);
      console.log(`   Welcome Template Name: ${hostTemplateConfig.welcome_template_name}`);
      console.log(`   Auto Templates Enabled: ${hostTemplateConfig.auto_templates_enabled}`);
    }
    
    const { data: hostWhatsAppConfig, error: hostWhatsAppError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('host_id', HOST_ID)
      .single();
    
    if (hostWhatsAppError) {
      console.log(`⚠️ Erreur ou pas de config WhatsApp pour cet hôte: ${hostWhatsAppError.message}`);
    } else if (hostWhatsAppConfig) {
      console.log(`✓ Configuration WhatsApp trouvée:`);
      console.log(`   Auto Welcome Enabled: ${hostWhatsAppConfig.auto_welcome_enabled}`);
      console.log(`   Welcome Template: ${hostWhatsAppConfig.welcome_template}`);
    }
    
  } catch (error) {
    console.error(`❌ Erreur générale:`, error);
  }
}

analyzeWhatsAppConfig();
