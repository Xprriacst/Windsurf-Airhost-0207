/**
 * Configuration directe WhatsApp pour l'environnement de développement
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function setupDevWhatsAppDirect() {
  console.log('🔧 Configuration directe WhatsApp pour développement...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Supprimer l'ancienne configuration si elle existe
    await devClient
      .from('whatsapp_config')
      .delete()
      .eq('phone_number_id', '256414537555113');

    // Insérer la nouvelle configuration directement
    const { data, error } = await devClient
      .from('whatsapp_config')
      .insert({
        phone_number_id: '256414537555113',
        token: 'EAAORJNNm8icBO8cEZA0dbav3XfJ1gzZBlCRuIjOtkdmXEM5HE8VP6Hn4xZBIZBs2ppct6JDZCwqTJ9WvwGbs9ho2ZAKxtwhB1MBDy8HijZARBP2cHUOeaFpR1Sy46bJihbHALbo6WKZBsTOo7a6jJUhtwUyCgcWlnlxOKpIu1hZASrH3qoE7lRIaDDTJOUxpnNaA1iloNdjnZBsLroHfEKTSzNVpGYinbvi0B6zi6WzAVg'
      })
      .select();

    if (error) {
      console.log('❌ Erreur insertion:', error);
      return;
    }

    console.log('✅ Configuration WhatsApp créée:', {
      id: data[0].id,
      phone_number_id: data[0].phone_number_id,
      hasToken: !!data[0].access_token
    });

    // Vérification
    const { data: verification } = await devClient
      .from('whatsapp_config')
      .select('*')
      .eq('phone_number_id', '256414537555113')
      .single();

    console.log('🔍 Vérification configuration:', {
      found: !!verification,
      phone_number_id: verification?.phone_number_id,
      hasToken: !!verification?.access_token
    });

    console.log('🎉 Configuration prête pour l\'edge function !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

setupDevWhatsAppDirect();