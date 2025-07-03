import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function checkCurrentConfig() {
  console.log('🔍 DIAGNOSTIC - État actuel de la configuration');
  console.log('='.repeat(50));
  
  try {
    const { data, error } = await supabase
      .from('whatsapp_template_config')
      .select('*')
      .eq('host_id', HOST_ID)
      .single();
    
    if (error) {
      console.error('❌ Erreur:', error);
      return null;
    }
    
    console.log('📋 Configuration actuelle:');
    console.log(`   host_id: ${data.host_id}`);
    console.log(`   auto_templates_enabled: ${data.auto_templates_enabled}`);
    console.log(`   send_welcome_template: ${data.send_welcome_template}`);
    console.log(`   welcome_template_name: ${data.welcome_template_name}`);
    console.log(`   created_at: ${data.created_at}`);
    console.log(`   updated_at: ${data.updated_at}`);
    
    return data;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return null;
  }
}

async function forceToggleOff() {
  console.log('\n🔧 FORÇAGE - Désactivation du toggle');
  console.log('='.repeat(50));
  
  try {
    const { data, error } = await supabase
      .from('whatsapp_template_config')
      .update({
        auto_templates_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('host_id', HOST_ID)
      .select();
    
    if (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      return false;
    }
    
    console.log('✅ Toggle forcé à OFF');
    console.log('📋 Nouvelle configuration:', data[0]);
    return true;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
}

async function forceToggleOn() {
  console.log('\n🔧 FORÇAGE - Activation du toggle');
  console.log('='.repeat(50));
  
  try {
    const { data, error } = await supabase
      .from('whatsapp_template_config')
      .update({
        auto_templates_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('host_id', HOST_ID)
      .select();
    
    if (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      return false;
    }
    
    console.log('✅ Toggle forcé à ON');
    console.log('📋 Nouvelle configuration:', data[0]);
    return true;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 DIAGNOSTIC TOGGLE WHATSAPP');
  console.log('='.repeat(50));
  
  // 1. Vérifier l'état actuel
  await checkCurrentConfig();
  
  // 2. Forcer le toggle à OFF
  await forceToggleOff();
  
  // 3. Vérifier l'état après OFF
  await checkCurrentConfig();
  
  // 4. Forcer le toggle à ON
  await forceToggleOn();
  
  // 5. Vérifier l'état final
  await checkCurrentConfig();
  
  console.log('\n✅ Diagnostic terminé');
}

main().catch(console.error);

export { checkCurrentConfig, forceToggleOff, forceToggleOn };
