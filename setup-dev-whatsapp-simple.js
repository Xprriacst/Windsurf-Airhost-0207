/**
 * Configuration simplifiée WhatsApp pour développement
 * Crée une configuration minimale sans dépendance à la colonne config
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

const PROD_SUPABASE_URL = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const PROD_SERVICE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

async function setupDevWhatsAppSimple() {
  console.log('🔧 Configuration WhatsApp simplifiée pour développement...');

  const prodClient = createClient(PROD_SUPABASE_URL, PROD_SERVICE_KEY);
  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Récupérer la configuration de production (colonnes de base seulement)
    const { data: prodConfig, error: prodError } = await prodClient
      .from('whatsapp_config')
      .select('phone_number_id, token, user_id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (prodError || !prodConfig) {
      console.error('❌ Configuration WhatsApp non trouvée en production:', prodError);
      return;
    }

    console.log('✅ Configuration trouvée en production:', {
      phone_number_id: prodConfig.phone_number_id,
      hasToken: !!prodConfig.token,
      user_id: prodConfig.user_id || 'non défini'
    });

    // Supprimer l'ancienne configuration en développement
    await devClient
      .from('whatsapp_config')
      .delete()
      .not('id', 'is', null);

    // Créer une configuration simplifiée en développement
    const simpleConfig = {
      user_id: prodConfig.user_id || 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
      phone_number_id: prodConfig.phone_number_id,
      token: prodConfig.token,
      // verification_token: 'airhost_webhook_verify_2024', // Colonne non présente
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: insertError } = await devClient
      .from('whatsapp_config')
      .insert([simpleConfig]);

    if (insertError) {
      console.error('❌ Erreur lors de l\'insertion:', insertError);
      return;
    }

    // Vérifier que la configuration a été créée
    const { data: verifyConfig, error: verifyError } = await devClient
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', simpleConfig.user_id)
      .single();

    if (verifyError || !verifyConfig) {
      console.error('❌ Échec de la vérification:', verifyError);
      return;
    }

    console.log('🎉 Configuration WhatsApp créée en développement !');
    console.log('📱 Détails:', {
      id: verifyConfig.id,
      user_id: verifyConfig.user_id,
      phone_number_id: verifyConfig.phone_number_id,
      hasToken: !!verifyConfig.token
    });

    console.log('\n✅ L\'edge function peut maintenant envoyer des templates automatiques');
    console.log('🚀 Prêt pour les tests avec Zapier');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

setupDevWhatsAppSimple();