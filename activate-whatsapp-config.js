/**
 * Active une configuration WhatsApp existante pour les tests
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function activateWhatsAppConfig() {
  console.log('🔧 Activation d\'une configuration WhatsApp\n');

  try {
    // Désactiver toutes les configurations existantes
    await supabase
      .from('whatsapp_config')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Activer la configuration la plus récente avec le bon phone_number_id
    const { data: activatedConfig, error: activateError } = await supabase
      .from('whatsapp_config')
      .update({ is_active: true })
      .eq('phone_number_id', '256414537555113')
      .order('updated_at', { ascending: false })
      .limit(1)
      .select()
      .single();

    if (activateError) {
      console.log('❌ Erreur activation:', activateError);
      return;
    }

    console.log('✅ Configuration activée:');
    console.log('   ID:', activatedConfig.id);
    console.log('   Phone Number ID:', activatedConfig.phone_number_id);
    console.log('   Token présent:', !!activatedConfig.token);
    console.log('   Statut:', activatedConfig.is_active ? 'ACTIF' : 'INACTIF');

    // Vérifier que la configuration est bien récupérable
    const { data: testConfig, error: testError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, token, is_active')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (testError) {
      console.log('❌ Erreur test récupération:', testError);
    } else {
      console.log('\n🧪 Test récupération comme les services:');
      console.log('✅ Configuration récupérée avec succès');
      console.log('   Phone Number ID:', testConfig.phone_number_id);
      console.log('   Token présent:', !!testConfig.token);
      console.log('   Actif:', testConfig.is_active);
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error);
  }
}

activateWhatsAppConfig().catch(console.error);