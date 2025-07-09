import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Clé SUPABASE_SERVICE_ROLE_KEY manquante dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const HOST_ID = process.argv[2] || 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function checkCurrentState() {
  console.log('🔍 DIAGNOSTIC TOGGLE SYNC');
  console.log('========================');
  
  try {
    // 1. Vérifier l'état actuel dans la base
    const { data: config, error } = await supabase
      .from('whatsapp_template_config')
      .select('*')
      .eq('host_id', HOST_ID)
      .single();

    if (error) {
      console.error('❌ Erreur récupération config:', error);
      return;
    }

    console.log('📊 État actuel en base:');
    console.log(`- auto_templates_enabled: ${config.auto_templates_enabled}`);
    console.log(`- send_welcome_template: ${config.send_welcome_template}`);
    console.log(`- welcome_template_name: ${config.welcome_template_name}`);
    console.log('');

    // 2. Test de mise à jour manuelle
    console.log('🧪 Test de mise à jour manuelle...');
    const newState = !config.auto_templates_enabled;
    
    const { error: updateError } = await supabase
      .from('whatsapp_template_config')
      .update({ 
        auto_templates_enabled: newState,
        updated_at: new Date().toISOString()
      })
      .eq('host_id', HOST_ID);

    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
      return;
    }

    console.log(`✅ Toggle mis à jour: ${config.auto_templates_enabled} → ${newState}`);
    
    // 3. Vérification de la mise à jour
    const { data: updatedConfig, error: checkError } = await supabase
      .from('whatsapp_template_config')
      .select('auto_templates_enabled, updated_at')
      .eq('host_id', HOST_ID)
      .single();

    if (checkError) {
      console.error('❌ Erreur vérification:', checkError);
      return;
    }

    console.log(`✅ Nouvel état confirmé: ${updatedConfig.auto_templates_enabled}`);
    console.log(`📅 Dernière mise à jour: ${updatedConfig.updated_at}`);
    
    // 4. Restaurer l'état initial pour le test
    console.log('');
    console.log('🔄 Restauration de l\'état initial...');
    const { error: restoreError } = await supabase
      .from('whatsapp_template_config')
      .update({ 
        auto_templates_enabled: config.auto_templates_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('host_id', HOST_ID);

    if (restoreError) {
      console.error('❌ Erreur restauration:', restoreError);
      return;
    }

    console.log('✅ État initial restauré');
    console.log('');
    console.log('🎯 CONCLUSION:');
    console.log('- La base de données fonctionne correctement');
    console.log('- Le problème est dans l\'interface React');
    console.log('- Il faut vérifier la fonction de sauvegarde dans WhatsAppConfig.tsx');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkCurrentState();
