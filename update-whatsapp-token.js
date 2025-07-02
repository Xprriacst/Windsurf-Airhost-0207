/**
 * Mise à jour du token WhatsApp avec le vrai token
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function updateWhatsAppToken() {
  console.log('🔧 Mise à jour du token WhatsApp...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Récupérer le token depuis la configuration existante
    const { data: existing } = await devClient
      .from('whatsapp_config')
      .select('token')
      .eq('phone_number_id', '604674832740532')
      .single();

    if (existing?.token) {
      // Mettre à jour avec le vrai token
      const { data, error } = await devClient
        .from('whatsapp_config')
        .update({
          token: existing.token
        })
        .eq('phone_number_id', '256414537555113')
        .select();

      if (error) {
        console.log('❌ Erreur mise à jour:', error);
        return;
      }

      console.log('✅ Token mis à jour pour phone_number_id: 256414537555113');
      
      // Vérification
      const { data: verification } = await devClient
        .from('whatsapp_config')
        .select('phone_number_id, token')
        .eq('phone_number_id', '256414537555113')
        .single();

      console.log('🔍 Configuration finale:', {
        phone_number_id: verification?.phone_number_id,
        hasValidToken: !!verification?.token && verification.token.length > 50
      });

    } else {
      console.log('❌ Token source non trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

updateWhatsAppToken();