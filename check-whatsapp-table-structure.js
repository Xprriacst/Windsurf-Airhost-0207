/**
 * Vérification de la structure de la table whatsapp_config
 */

import { createClient } from '@supabase/supabase-js';

const DEV_SUPABASE_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

async function checkWhatsAppTableStructure() {
  console.log('🔍 Vérification structure table whatsapp_config...');

  const devClient = createClient(DEV_SUPABASE_URL, DEV_SERVICE_KEY);

  try {
    // Récupérer un exemple d'enregistrement pour voir la structure
    const { data: sample, error: sampleError } = await devClient
      .from('whatsapp_config')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Erreur récupération sample:', sampleError);
      return;
    }

    console.log('📋 Structure détectée:', sample.length > 0 ? Object.keys(sample[0]) : 'Table vide');
    
    if (sample.length > 0) {
      console.log('🔍 Premier enregistrement:', sample[0]);
    }

    // Essayer de récupérer la structure via query SQL
    const { data: structure, error: structureError } = await devClient
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'whatsapp_config' 
          ORDER BY ordinal_position;
        `
      });

    if (structure) {
      console.log('📊 Colonnes de la table:', structure);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkWhatsAppTableStructure();