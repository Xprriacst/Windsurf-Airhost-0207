/**
 * Script pour copier la configuration WhatsApp de production vers développement
 * Permet à l'edge function Supabase de fonctionner avec les templates automatiques
 */

import { createClient } from '@supabase/supabase-js';

// Configuration base de données production
const PROD_SUPABASE_URL = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const PROD_SERVICE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

// Configuration base de données développement  
const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function copyWhatsAppConfig() {
  console.log('🔄 Copie de la configuration WhatsApp production → développement...');

  // Clients Supabase
  const prodClient = createClient(PROD_SUPABASE_URL, PROD_SERVICE_KEY);
  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Récupérer la configuration WhatsApp de production
    const { data: prodConfig, error: prodError } = await prodClient
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (prodError || !prodConfig) {
      console.error('❌ Erreur: configuration WhatsApp non trouvée en production:', prodError);
      return;
    }

    console.log('✅ Configuration WhatsApp trouvée en production:', {
      id: prodConfig.id,
      user_id: prodConfig.user_id,
      phone_number_id: prodConfig.phone_number_id,
      hasToken: !!prodConfig.token
    });

    // Vérifier si la configuration existe déjà en développement
    const { data: existingConfig } = await devClient
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', prodConfig.user_id)
      .single();

    if (existingConfig) {
      // Mettre à jour la configuration existante
      const { error: updateError } = await devClient
        .from('whatsapp_config')
        .update({
          phone_number_id: prodConfig.phone_number_id,
          token: prodConfig.token,
          verification_token: prodConfig.verification_token,
          config: prodConfig.config,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', prodConfig.user_id);

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError);
        return;
      }

      console.log('✅ Configuration WhatsApp mise à jour en développement');
    } else {
      // Créer une nouvelle configuration
      const { error: insertError } = await devClient
        .from('whatsapp_config')
        .insert([{
          user_id: prodConfig.user_id,
          phone_number_id: prodConfig.phone_number_id,
          token: prodConfig.token,
          verification_token: prodConfig.verification_token,
          config: prodConfig.config || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('❌ Erreur lors de l\'insertion:', insertError);
        return;
      }

      console.log('✅ Configuration WhatsApp créée en développement');
    }

    // Vérifier que la copie a fonctionné
    const { data: verifyConfig, error: verifyError } = await devClient
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', prodConfig.user_id)
      .single();

    if (verifyError || !verifyConfig) {
      console.error('❌ Échec de la vérification:', verifyError);
      return;
    }

    console.log('🎉 Configuration WhatsApp copiée avec succès !');
    console.log('📱 Détails:', {
      user_id: verifyConfig.user_id,
      phone_number_id: verifyConfig.phone_number_id,
      hasToken: !!verifyConfig.token,
      config_size: JSON.stringify(verifyConfig.config || {}).length
    });

    console.log('\n🚀 L\'edge function Supabase peut maintenant envoyer des templates automatiques !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
copyWhatsAppConfig();