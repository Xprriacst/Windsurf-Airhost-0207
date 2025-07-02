/**
 * Debug de la configuration WhatsApp
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function debugWhatsAppConfig() {
  console.log('🔍 Debug configuration WhatsApp...');
  
  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);
  
  try {
    // Récupérer toutes les configurations
    const { data: allConfigs, error: allError } = await devClient
      .from('whatsapp_config')
      .select('*');
    
    if (allError) {
      console.log('❌ Erreur récupération configs:', allError);
      return;
    }
    
    console.log(`📋 Total configurations: ${allConfigs?.length || 0}`);
    
    if (allConfigs && allConfigs.length > 0) {
      allConfigs.forEach((config, index) => {
        console.log(`\n--- Configuration ${index + 1} ---`);
        console.log('ID:', config.id);
        console.log('User ID:', config.user_id);
        console.log('Phone Number ID:', config.phone_number_id);
        console.log('Has Token:', !!config.token);
        console.log('Token length:', config.token?.length || 0);
        console.log('Created:', config.created_at);
        console.log('Updated:', config.updated_at);
      });
    }
    
    // Test spécifique pour notre utilisateur
    const targetUserId = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';
    console.log(`\n🎯 Test pour user: ${targetUserId}`);
    
    const { data: userConfig, error: userError } = await devClient
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', targetUserId);
    
    if (userError) {
      console.log('❌ Erreur config utilisateur:', userError);
    } else {
      console.log('✅ Config utilisateur trouvée:', userConfig?.length || 0);
      userConfig?.forEach(config => {
        console.log('  - Phone Number ID:', config.phone_number_id);
        console.log('  - Token présent:', !!config.token);
        console.log('  - Token valide:', config.token && config.token.length > 50);
      });
    }
    
    // Test de la requête utilisée dans l'edge function
    console.log('\n🔍 Test requête edge function...');
    const { data: edgeConfig, error: edgeError } = await devClient
      .from('whatsapp_config')
      .select('phone_number_id, token, config')
      .eq('user_id', targetUserId)
      .not('token', 'is', null)
      .neq('token', '')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (edgeError) {
      console.log('❌ Erreur requête edge function:', edgeError);
    } else {
      console.log('✅ Config edge function:');
      console.log('  - Phone Number ID:', edgeConfig.phone_number_id);
      console.log('  - Token présent:', !!edgeConfig.token);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

debugWhatsAppConfig();