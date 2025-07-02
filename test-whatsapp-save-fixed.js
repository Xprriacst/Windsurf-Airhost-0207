/**
 * Test de la sauvegarde WhatsApp corrigée
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Reproduire la logique du service WhatsApp corrigé
async function saveConfig(config) {
  try {
    console.log("Tentative de sauvegarde:", config);
    
    // Préparer les données avec seulement les colonnes existantes
    const dataToSave = {
      phone_number_id: config.phone_number_id,
      token: config.token,
      updated_at: new Date().toISOString()
    };
    
    console.log("Données à sauvegarder:", dataToSave);
    
    // Vérifier s'il y a déjà une configuration
    const { data: existing, error: selectError } = await supabase
      .from('whatsapp_config')
      .select('id')
      .limit(1);
    
    if (selectError) {
      console.error("Erreur lors de la vérification:", selectError);
      return false;
    }
    
    let result;
    if (existing && existing.length > 0) {
      // Mise à jour
      console.log("Mise à jour de la configuration existante ID:", existing[0].id);
      result = await supabase
        .from('whatsapp_config')
        .update(dataToSave)
        .eq('id', existing[0].id);
    } else {
      // Création
      console.log("Création d'une nouvelle configuration");
      result = await supabase
        .from('whatsapp_config')
        .insert(dataToSave);
    }
    
    if (result.error) {
      console.error("Erreur lors de la sauvegarde:", result.error);
      return false;
    }
    
    console.log("Configuration sauvegardée avec succès");
    return true;
  } catch (err) {
    console.error("Exception:", err);
    return false;
  }
}

async function testSave() {
  console.log('=== TEST SAUVEGARDE WHATSAPP CORRIGÉE ===\n');

  const testConfig = {
    phone_number_id: '604674832740532',
    token: 'EAAORJNNm8icBOyaeAf0BGSuGVkp9It7WoMmbcKjxoFzZAOVSJ6cF8AVyo5Qfudbkl5bZCemcCmKEAxWdELOMY8A7PQiIFqwT4S42jcpujmRf7RhJRoddHiEZB03PlbKpA6gxYUrthDTv5ZAr21r1fkEkz6MkxrGQiwKAbpDse5yT3ZAoB23e539Bq7eAGNZBRqSdWnoyjrfpWT7Y89S6iRouCbWRXzA5XiedkZD',
    send_welcome_template: true,
    welcome_template_name: 'hello_world'
  };

  const success = await saveConfig(testConfig);
  
  if (success) {
    console.log('\n✅ SAUVEGARDE RÉUSSIE');
    
    // Vérifier la récupération
    const { data: saved } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    console.log('Configuration sauvegardée:', saved[0]);
  } else {
    console.log('\n❌ SAUVEGARDE ÉCHOUÉE');
  }
  
  return success;
}

testSave().then(success => process.exit(success ? 0 : 1));