/**
 * Ajoute les colonnes pour les templates de bienvenue à la table whatsapp_config
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTemplateColumns() {
  try {
    console.log('=== AJOUT DES COLONNES TEMPLATES ===\n');

    // Vérifier la structure actuelle
    console.log('1. Vérification de la structure actuelle...');
    const { data: currentData, error: selectError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('Erreur lors de la lecture:', selectError);
      return false;
    }

    if (currentData && currentData.length > 0) {
      console.log('Structure actuelle:', Object.keys(currentData[0]));
      
      // Vérifier si les colonnes existent déjà
      const currentColumns = Object.keys(currentData[0]);
      const hasTemplateColumns = currentColumns.includes('send_welcome_template') && 
                                currentColumns.includes('welcome_template_name');
      
      if (hasTemplateColumns) {
        console.log('✅ Les colonnes templates existent déjà');
        return true;
      }
    }

    console.log('\n2. Ajout des colonnes templates...');
    
    // Utiliser l'API SQL directe pour ajouter les colonnes
    const { error: addColumnsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE whatsapp_config 
        ADD COLUMN IF NOT EXISTS send_welcome_template BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS welcome_template_name TEXT DEFAULT '';
      `
    });

    if (addColumnsError) {
      console.log('Tentative alternative avec ALTER TABLE séparés...');
      
      // Essayer avec des commandes séparées
      const { error: error1 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS send_welcome_template BOOLEAN DEFAULT false;'
      });
      
      const { error: error2 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS welcome_template_name TEXT DEFAULT \'\';'
      });
      
      if (error1 || error2) {
        console.error('Erreurs lors de l\'ajout des colonnes:', { error1, error2 });
        
        // Dernière tentative : mise à jour manuelle
        console.log('\n3. Tentative de mise à jour manuelle...');
        const testConfig = {
          phone_number_id: '604674832740532',
          token: 'test_token',
          send_welcome_template: true,
          welcome_template_name: 'hello_world'
        };
        
        const { error: insertError } = await supabase
          .from('whatsapp_config')
          .upsert(testConfig);
          
        if (insertError) {
          console.error('Erreur lors de l\'insertion test:', insertError);
          console.log('\n⚠️  Les colonnes n\'existent pas et ne peuvent pas être ajoutées automatiquement');
          console.log('Veuillez ajouter manuellement dans Supabase Dashboard:');
          console.log('- send_welcome_template (BOOLEAN, DEFAULT false)');
          console.log('- welcome_template_name (TEXT, DEFAULT \'\')');
          return false;
        }
      }
    }

    console.log('\n4. Vérification finale...');
    const { data: finalData, error: finalError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(1);

    if (finalError) {
      console.error('Erreur lors de la vérification finale:', finalError);
      return false;
    }

    if (finalData && finalData.length > 0) {
      const finalColumns = Object.keys(finalData[0]);
      console.log('Structure finale:', finalColumns);
      
      const hasTemplateColumns = finalColumns.includes('send_welcome_template') && 
                                finalColumns.includes('welcome_template_name');
      
      if (hasTemplateColumns) {
        console.log('\n✅ COLONNES TEMPLATES AJOUTÉES AVEC SUCCÈS !');
        return true;
      }
    }

    console.log('\n⚠️  Impossible de confirmer l\'ajout des colonnes');
    return false;

  } catch (err) {
    console.error('Exception:', err);
    return false;
  }
}

addTemplateColumns().then(success => {
  if (success) {
    console.log('\n🎉 Configuration des templates prête !');
  } else {
    console.log('\n❌ Échec de la configuration des templates');
  }
  process.exit(success ? 0 : 1);
});