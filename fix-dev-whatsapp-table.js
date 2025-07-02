/**
 * Corrige la structure de la table whatsapp_config dans la base de développement
 * pour qu'elle corresponde à la production
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function fixDevWhatsAppTable() {
  console.log('🔧 Correction de la table whatsapp_config en développement...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Ajouter la colonne config si elle n'existe pas
    const { error: alterError } = await devClient.rpc('execute_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'whatsapp_config' 
            AND column_name = 'config'
          ) THEN
            ALTER TABLE whatsapp_config ADD COLUMN config JSONB DEFAULT '{}';
            RAISE NOTICE 'Colonne config ajoutée à whatsapp_config';
          ELSE
            RAISE NOTICE 'Colonne config existe déjà dans whatsapp_config';
          END IF;
        END $$;
      `
    });

    if (alterError) {
      console.error('❌ Erreur lors de l\'ajout de la colonne config:', alterError);
      return false;
    }

    console.log('✅ Structure de la table whatsapp_config corrigée');
    return true;

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    return false;
  }
}

// Fonction pour copier la configuration après correction de la table
async function copyConfigAfterFix() {
  const tableFixed = await fixDevWhatsAppTable();
  
  if (!tableFixed) {
    console.error('❌ Impossible de corriger la table, abandon de la copie');
    return;
  }

  // Maintenant copier la configuration
  const PROD_SUPABASE_URL = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
  const PROD_SERVICE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

  const prodClient = createClient(PROD_SUPABASE_URL, PROD_SERVICE_KEY);
  const devClient = createClient(DEV_SUPABASE_URL, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY);

  console.log('🔄 Copie de la configuration WhatsApp production → développement...');

  try {
    // Récupérer la configuration de production
    const { data: prodConfig, error: prodError } = await prodClient
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (prodError || !prodConfig) {
      console.error('❌ Configuration WhatsApp non trouvée en production:', prodError);
      return;
    }

    console.log('✅ Configuration trouvée en production:', {
      id: prodConfig.id,
      user_id: prodConfig.user_id || 'non défini',
      phone_number_id: prodConfig.phone_number_id,
      hasToken: !!prodConfig.token
    });

    // Insérer en développement avec user_id par défaut si manquant
    const configToInsert = {
      user_id: prodConfig.user_id || 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7', // ID utilisateur par défaut
      phone_number_id: prodConfig.phone_number_id,
      token: prodConfig.token,
      verification_token: prodConfig.verification_token || 'airhost_webhook_verify_2024',
      config: prodConfig.config || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Supprimer l'ancienne configuration si elle existe
    await devClient
      .from('whatsapp_config')
      .delete()
      .eq('user_id', configToInsert.user_id);

    // Insérer la nouvelle configuration
    const { error: insertError } = await devClient
      .from('whatsapp_config')
      .insert([configToInsert]);

    if (insertError) {
      console.error('❌ Erreur lors de l\'insertion:', insertError);
      return;
    }

    console.log('🎉 Configuration WhatsApp copiée avec succès !');
    console.log('📱 L\'edge function peut maintenant envoyer des templates automatiques');

  } catch (error) {
    console.error('❌ Erreur lors de la copie:', error);
  }
}

copyConfigAfterFix();