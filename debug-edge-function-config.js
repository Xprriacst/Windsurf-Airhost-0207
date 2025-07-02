/**
 * Debug de la configuration WhatsApp pour l'edge function
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function debugEdgeFunctionConfig() {
  console.log('🔍 Debug configuration WhatsApp pour edge function...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Test exact de la requête de l'edge function
    console.log('📋 Toutes les configurations WhatsApp:');
    const { data: allConfigs } = await devClient
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false });

    allConfigs?.forEach(config => {
      console.log(`  - ID: ${config.id}`);
      console.log(`    Phone ID: ${config.phone_number_id}`);
      console.log(`    Token: ${config.token ? 'Présent (' + config.token.length + ' chars)' : 'Absent'}`);
      console.log(`    Updated: ${config.updated_at}`);
      console.log('');
    });

    // Test la requête exacte de l'edge function
    console.log('🎯 Test requête edge function:');
    const { data: edgeConfig, error: edgeError } = await devClient
      .from('whatsapp_config')
      .select('phone_number_id, token')
      .not('token', 'is', null)
      .neq('token', '')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (edgeError) {
      console.log('❌ Erreur requête edge function:', edgeError);
    } else {
      console.log('✅ Configuration trouvée par edge function:', {
        phone_number_id: edgeConfig.phone_number_id,
        hasToken: !!edgeConfig.token,
        tokenLength: edgeConfig.token?.length || 0
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

debugEdgeFunctionConfig();