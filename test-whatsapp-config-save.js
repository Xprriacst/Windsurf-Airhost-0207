/**
 * Test de diagnostic pour la sauvegarde de configuration WhatsApp
 * Identifie et corrige les problèmes de structure de table
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase depuis .env
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables d\'environnement manquantes:', {
    url: !!supabaseUrl,
    key: !!supabaseKey
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticWhatsAppConfig() {
  console.log('=== DIAGNOSTIC CONFIGURATION WHATSAPP ===\n');

  try {
    // 1. Vérifier la structure de la table
    console.log('1. Vérification de la structure de la table whatsapp_config...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.log('Table whatsapp_config n\'existe pas. Création...');
      
      // Créer la table si elle n'existe pas
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql_text: `
          CREATE TABLE IF NOT EXISTS whatsapp_config (
            id SERIAL PRIMARY KEY,
            phone_number_id TEXT NOT NULL,
            token TEXT NOT NULL,
            send_welcome_template BOOLEAN DEFAULT false,
            welcome_template_name TEXT,
            auto_welcome_enabled BOOLEAN DEFAULT false,
            welcome_template TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      });
      
      if (createError) {
        console.error('Erreur création table:', createError);
        return false;
      }
      console.log('✓ Table whatsapp_config créée');
    } else {
      console.log('✓ Table whatsapp_config existe');
    }

    // 2. Tester la récupération
    console.log('\n2. Test de récupération de configuration...');
    const { data: existingConfig, error: getError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (getError) {
      console.error('Erreur récupération:', getError);
      return false;
    }
    
    console.log('Configuration existante:', existingConfig);

    // 3. Tester la sauvegarde
    console.log('\n3. Test de sauvegarde de configuration...');
    
    // D'abord, ajouter les colonnes manquantes
    console.log('Ajout des colonnes manquantes...');
    
    const addColumnsQueries = [
      'ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS send_welcome_template BOOLEAN DEFAULT false;',
      'ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS welcome_template_name TEXT;',
      'ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS auto_welcome_enabled BOOLEAN DEFAULT false;',
      'ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS welcome_template TEXT;'
    ];
    
    for (const query of addColumnsQueries) {
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql_text: query
      });
      
      if (alterError && !alterError.message.includes('already exists')) {
        console.log('Ajout colonne:', query.split(' ')[5], alterError ? 'ERREUR' : 'OK');
      }
    }
    
    console.log('✓ Colonnes ajoutées');

    const testConfig = {
      phone_number_id: '604674832740532',
      token: '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
      send_welcome_template: true,
      welcome_template_name: 'hello_world',
      auto_welcome_enabled: true,
      welcome_template: 'hello_world',
      updated_at: new Date().toISOString()
    };

    const { data: saveResult, error: saveError } = await supabase
      .from('whatsapp_config')
      .upsert(testConfig)
      .select();
    
    if (saveError) {
      console.error('Erreur sauvegarde:', saveError);
      return false;
    }
    
    console.log('✓ Sauvegarde réussie:', saveResult);

    // 4. Vérifier la sauvegarde
    console.log('\n4. Vérification de la sauvegarde...');
    const { data: verifyConfig, error: verifyError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (verifyError) {
      console.error('Erreur vérification:', verifyError);
      return false;
    }
    
    console.log('✓ Configuration sauvegardée correctement:', verifyConfig[0]);

    return true;
  } catch (error) {
    console.error('Erreur diagnostic:', error);
    return false;
  }
}

async function main() {
  const success = await diagnosticWhatsAppConfig();
  
  if (success) {
    console.log('\n✅ DIAGNOSTIC RÉUSSI - La configuration WhatsApp fonctionne correctement');
  } else {
    console.log('\n❌ DIAGNOSTIC ÉCHOUÉ - Problèmes détectés');
  }
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error);