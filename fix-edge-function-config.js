/**
 * Création d'une configuration WhatsApp pour l'edge function
 * Adapte la configuration à la structure existante
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function fixEdgeFunctionConfig() {
  console.log('🔧 Configuration WhatsApp pour edge function...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Créer une nouvelle configuration compatible
    const { data: newConfig, error: insertError } = await devClient
      .from('whatsapp_config')
      .insert([{
        phone_number_id: '256414537555113',
        token: process.env.WHATSAPP_TOKEN || 'test_token_configured',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur insertion:', insertError);
      return;
    }

    console.log('✅ Configuration créée:', newConfig);

    // Vérifier la récupération
    const { data: verifyConfig, error: verifyError } = await devClient
      .from('whatsapp_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verifyError) {
      console.error('❌ Erreur vérification:', verifyError);
      return;
    }

    console.log('🎉 Configuration prête pour edge function:', {
      id: verifyConfig.id,
      phone_number_id: verifyConfig.phone_number_id,
      hasToken: !!verifyConfig.token && verifyConfig.token !== 'test_token_configured'
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

fixEdgeFunctionConfig();