/**
 * Support progressif des templates WhatsApp
 * Utilise un stockage JSON dans la colonne existante pour éviter les modifications de schéma
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupProgressiveTemplateSupport() {
  try {
    console.log('=== SETUP SUPPORT PROGRESSIF DES TEMPLATES ===\n');

    // 1. Vérifier la configuration actuelle
    console.log('1. Vérification de la configuration actuelle...');
    const { data: currentConfig, error: selectError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('Erreur lors de la lecture:', selectError);
      return false;
    }

    console.log('Structure actuelle:', currentConfig?.[0] ? Object.keys(currentConfig[0]) : 'Aucune configuration');

    // 2. Créer une configuration étendue avec templates
    console.log('\n2. Création de la configuration étendue...');
    
    // Configuration par défaut avec support des templates
    const extendedConfig = {
      phone_number_id: currentConfig?.[0]?.phone_number_id || '',
      token: currentConfig?.[0]?.token || '',
      
      // Nouveaux paramètres stockés en format structuré
      template_config: JSON.stringify({
        send_welcome_template: false,
        welcome_template_name: '',
        auto_templates_enabled: false,
        template_language: 'fr',
        fallback_message: 'Bienvenue ! Nous reviendrons vers vous rapidement.'
      }),
      
      updated_at: new Date().toISOString()
    };

    // 3. Sauvegarder ou mettre à jour la configuration étendue
    let result;
    if (currentConfig && currentConfig.length > 0) {
      // Préserver les valeurs existantes et ajouter le support des templates
      const preservedConfig = {
        ...extendedConfig,
        phone_number_id: currentConfig[0].phone_number_id,
        token: currentConfig[0].token
      };
      
      console.log('Mise à jour de la configuration existante...');
      result = await supabase
        .from('whatsapp_config')
        .update(preservedConfig)
        .eq('id', currentConfig[0].id);
    } else {
      console.log('Création d\'une nouvelle configuration...');
      result = await supabase
        .from('whatsapp_config')
        .insert(extendedConfig);
    }

    if (result.error) {
      console.error('Erreur lors de la sauvegarde:', result.error);
      
      // Tentative alternative : utiliser uniquement les colonnes de base
      console.log('\n3. Tentative alternative avec colonnes de base...');
      
      const basicConfig = {
        phone_number_id: currentConfig?.[0]?.phone_number_id || '604674832740532',
        token: currentConfig?.[0]?.token || 'placeholder_token',
        updated_at: new Date().toISOString()
      };
      
      const basicResult = currentConfig && currentConfig.length > 0
        ? await supabase
            .from('whatsapp_config')
            .update(basicConfig)
            .eq('id', currentConfig[0].id)
        : await supabase
            .from('whatsapp_config')
            .insert(basicConfig);
      
      if (basicResult.error) {
        console.error('Erreur lors de la sauvegarde basique:', basicResult.error);
        return false;
      }
      
      console.log('✅ Configuration de base sauvegardée');
      return 'basic';
    }

    console.log('✅ Configuration étendue avec templates sauvegardée');

    // 4. Vérification finale
    console.log('\n4. Vérification finale...');
    const { data: finalConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(1);

    if (finalConfig && finalConfig.length > 0) {
      console.log('Configuration finale:', {
        id: finalConfig[0].id,
        phone_number_id: finalConfig[0].phone_number_id ? '✓' : '✗',
        token: finalConfig[0].token ? '✓' : '✗',
        template_config: finalConfig[0].template_config ? '✓' : '✗',
        columns: Object.keys(finalConfig[0])
      });
      
      // Tester le parsing du template_config s'il existe
      if (finalConfig[0].template_config) {
        try {
          const templateSettings = JSON.parse(finalConfig[0].template_config);
          console.log('Templates configurés:', templateSettings);
        } catch (e) {
          console.log('Template config existe mais n\'est pas du JSON valide');
        }
      }
      
      return 'extended';
    }

    return 'basic';

  } catch (err) {
    console.error('Exception:', err);
    return false;
  }
}

setupProgressiveTemplateSupport().then(result => {
  if (result === 'extended') {
    console.log('\n🎉 SUPPORT COMPLET DES TEMPLATES CONFIGURÉ !');
    console.log('✓ Configuration WhatsApp de base');
    console.log('✓ Support des templates de bienvenue');
    console.log('✓ Paramètres avancés disponibles');
  } else if (result === 'basic') {
    console.log('\n✅ Configuration de base prête');
    console.log('✓ Configuration WhatsApp sauvegardée');
    console.log('⚠ Templates disponibles en mode simplifié');
  } else {
    console.log('\n❌ Échec de la configuration');
  }
  
  process.exit(result ? 0 : 1);
});