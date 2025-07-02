/**
 * Création manuelle d'une configuration WhatsApp pour développement
 * Utilise les informations connues pour permettre les tests d'edge function
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function createDevWhatsAppManual() {
  console.log('🔧 Création manuelle de la configuration WhatsApp pour développement...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Vérifier la structure de la table
    const { data: tableInfo, error: tableError } = await devClient
      .from('whatsapp_config')
      .select('*')
      .limit(1);

    console.log('Structure actuelle de la table whatsapp_config:', tableInfo || 'vide');

    // Supprimer toute configuration existante
    await devClient
      .from('whatsapp_config')
      .delete()
      .not('id', 'is', null);

    // Mettre à jour la configuration existante avec les bonnes informations
    const { data: updatedConfig, error: updateError } = await devClient
      .from('whatsapp_config')
      .update({
        phone_number_id: '256414537555113', // ID de production
        token: process.env.WHATSAPP_TOKEN || 'test_token_dev',
        updated_at: new Date().toISOString()
      })
      .eq('id', 'dd285147-ad0b-46dd-896e-beea8187e1b5') // ID existant
      .select()
      .single();

    console.log('Configuration mise à jour:', {
      phone_number_id: '256414537555113',
      hasToken: !!(process.env.WHATSAPP_TOKEN)
    });

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return;
    }

    console.log('✅ Configuration WhatsApp mise à jour:', updatedConfig);

    // Vérifier que la configuration est récupérable par l'edge function
    const { data: verifyConfig, error: verifyError } = await devClient
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (verifyError || !verifyConfig) {
      console.error('❌ Échec de la vérification:', verifyError);
      return;
    }

    console.log('🎉 Configuration WhatsApp disponible pour l\'edge function !');
    console.log('📱 Détails finaux:', {
      id: verifyConfig.id,
      phone_number_id: verifyConfig.phone_number_id,
      hasToken: !!verifyConfig.token && verifyConfig.token !== 'test_token_dev'
    });

    if (verifyConfig.token === 'test_token_dev') {
      console.log('⚠️  ATTENTION: Token WhatsApp non configuré. Vous devez fournir WHATSAPP_TOKEN pour l\'envoi réel.');
    } else {
      console.log('✅ Token WhatsApp configuré - envoi de templates possible');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createDevWhatsAppManual();