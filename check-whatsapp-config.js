/**
 * Vérification de la configuration WhatsApp dans la base de données
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWhatsAppConfig() {
  console.log('🔍 Vérification de la configuration WhatsApp\n');

  try {
    // Vérifier les configurations existantes
    const { data: configs, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.log('❌ Erreur lors de la récupération:', error);
      return;
    }

    if (!configs || configs.length === 0) {
      console.log('⚠️ Aucune configuration WhatsApp trouvée');
      console.log('Création d\'une configuration de test...\n');

      // Créer une configuration de test
      const { data: newConfig, error: insertError } = await supabase
        .from('whatsapp_config')
        .insert([{
          phone_number_id: '256414537555113',
          token: 'test_token_placeholder', // Sera remplacé par la vraie valeur
          send_welcome_message: true,
          welcome_template: 'hello_world',
          is_active: true
        }])
        .select()
        .single();

      if (insertError) {
        console.log('❌ Erreur création config:', insertError);
      } else {
        console.log('✅ Configuration créée:', newConfig);
      }
    } else {
      console.log(`📋 ${configs.length} configuration(s) trouvée(s):`);
      configs.forEach((config, index) => {
        console.log(`\n${index + 1}. Configuration ID: ${config.id}`);
        console.log(`   Phone Number ID: ${config.phone_number_id}`);
        console.log(`   Token: ${config.token ? '[PRÉSENT]' : '[MANQUANT]'}`);
        console.log(`   Messages de bienvenue: ${config.send_welcome_message ? 'ACTIVÉS' : 'DÉSACTIVÉS'}`);
        console.log(`   Template: ${config.welcome_template || '[NON DÉFINI]'}`);
        console.log(`   Actif: ${config.is_active ? 'OUI' : 'NON'}`);
        console.log(`   Dernière maj: ${config.updated_at}`);
      });
    }

    // Test de récupération comme le font les services
    console.log('\n🧪 Test de récupération comme les services:');
    const { data: testConfig, error: testError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (testError) {
      console.log('❌ Erreur test récupération:', testError);
    } else {
      console.log('✅ Test récupération réussi:');
      console.log('   Phone Number ID:', testConfig.phone_number_id);
      console.log('   Token présent:', !!testConfig.token);
      console.log('   Messages activés:', testConfig.send_welcome_message);
      console.log('   Template:', testConfig.welcome_template);
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error);
  }
}

checkWhatsAppConfig().catch(console.error);