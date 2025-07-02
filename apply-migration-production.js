/**
 * Application directe de la migration en production via l'API Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🚀 Application de la migration du système d\'urgence GPT-4o');
  console.log('Base de données:', process.env.VITE_SUPABASE_URL);
  console.log('=' .repeat(70));
  
  try {
    // 1. Ajouter les colonnes d'urgence une par une
    console.log('\n📋 1. Ajout des colonnes d\'analyse d\'urgence...');
    
    const columns = [
      { name: 'emergency_status', type: 'VARCHAR(50)' },
      { name: 'priority_level', type: 'INTEGER' },
      { name: 'ai_analysis_type', type: 'VARCHAR(20)' },
      { name: 'needs_attention', type: 'BOOLEAN DEFAULT false' },
      { name: 'whatsapp_message_id', type: 'VARCHAR(100)' },
      { name: 'analysis_confidence', type: 'DECIMAL(3,2)' },
      { name: 'analysis_timestamp', type: 'TIMESTAMP WITH TIME ZONE' }
    ];
    
    for (const col of columns) {
      try {
        // Vérifier si la colonne existe déjà
        const { data: existing } = await supabase
          .from('conversations')
          .select(col.name)
          .limit(1);
        
        if (existing) {
          console.log(`✅ Colonne ${col.name} existe déjà`);
        }
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`🔄 Ajout de la colonne ${col.name}...`);
          // La colonne n'existe pas, il faut l'ajouter manuellement via l'interface Supabase
          console.log(`⚠️ Colonne ${col.name} doit être ajoutée manuellement dans Supabase`);
        }
      }
    }
    
    // 2. Créer la table emergency_cases si elle n'existe pas
    console.log('\n🚨 2. Vérification de la table emergency_cases...');
    
    try {
      const { data } = await supabase
        .from('emergency_cases')
        .select('count')
        .limit(1);
      console.log('✅ Table emergency_cases existe déjà');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️ Table emergency_cases doit être créée manuellement dans Supabase');
        console.log('SQL à exécuter:');
        console.log(`
CREATE TABLE emergency_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  host_id UUID NOT NULL,
  emergency_type VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
      }
    }
    
    // 3. Créer la table whatsapp_config si elle n'existe pas
    console.log('\n📱 3. Vérification de la table whatsapp_config...');
    
    try {
      const { data } = await supabase
        .from('whatsapp_config')
        .select('count')
        .limit(1);
      console.log('✅ Table whatsapp_config existe déjà');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️ Table whatsapp_config doit être créée manuellement dans Supabase');
        console.log('SQL à exécuter:');
        console.log(`
CREATE TABLE whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id VARCHAR(100) NOT NULL,
  access_token TEXT NOT NULL,
  webhook_verify_token VARCHAR(100),
  business_account_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
      }
    }
    
    // 4. Test des colonnes d'urgence existantes
    console.log('\n🔍 4. Test des colonnes existantes...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('conversations')
        .select('id, guest_name, emergency_status, priority_level')
        .limit(3);
      
      if (testError) {
        console.log('⚠️ Colonnes d\'urgence manquantes:', testError.message);
        console.log('\n📝 SQL à exécuter dans l\'éditeur Supabase:');
        console.log(`
-- Colonnes d'analyse d'urgence
ALTER TABLE conversations ADD COLUMN emergency_status VARCHAR(50);
ALTER TABLE conversations ADD COLUMN priority_level INTEGER;
ALTER TABLE conversations ADD COLUMN ai_analysis_type VARCHAR(20);
ALTER TABLE conversations ADD COLUMN needs_attention BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN whatsapp_message_id VARCHAR(100);
ALTER TABLE conversations ADD COLUMN analysis_confidence DECIMAL(3,2);
ALTER TABLE conversations ADD COLUMN analysis_timestamp TIMESTAMP WITH TIME ZONE;`);
      } else {
        console.log('✅ Colonnes d\'urgence fonctionnelles');
        testData?.forEach(conv => 
          console.log(`   - ${conv.guest_name}: status=${conv.emergency_status || 'null'}`)
        );
      }
    } catch (error) {
      console.log('❌ Erreur test:', error.message);
    }
    
    // 5. Migrer les données existantes avec analyse basique
    console.log('\n🔄 5. Migration des conversations existantes...');
    
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id, guest_name, last_message')
      .limit(10);
    
    if (fetchError) {
      console.log('⚠️ Impossible de récupérer les conversations:', fetchError.message);
    } else {
      console.log(`📊 ${conversations?.length || 0} conversation(s) trouvées`);
      
      // Analyser chaque conversation pour détecter des urgences
      let urgentCount = 0;
      let normalCount = 0;
      
      for (const conv of conversations || []) {
        const message = conv.last_message?.toLowerCase() || '';
        
        // Détection d'urgence basée sur les mots-clés
        const isUrgent = message.includes('urgence') || 
                        message.includes('problème') ||
                        message.includes('serrure') ||
                        message.includes('clés') ||
                        message.includes('clé') ||
                        message.includes('porte') ||
                        message.includes('fermer') ||
                        message.includes('sortir') ||
                        message.includes('aide');
        
        if (isUrgent) {
          urgentCount++;
          console.log(`🚨 URGENT: ${conv.guest_name} - "${conv.last_message?.substring(0, 50)}..."`);
        } else {
          normalCount++;
          console.log(`📝 Normal: ${conv.guest_name}`);
        }
      }
      
      console.log(`\n📈 Statistiques:
   - Conversations urgentes détectées: ${urgentCount}
   - Conversations normales: ${normalCount}
   - Total analysé: ${conversations?.length || 0}`);
    }
    
    // 6. Instructions finales
    console.log('\n🎯 6. Instructions pour finaliser la migration:');
    console.log(`
1. Aller dans l'éditeur SQL de Supabase (${process.env.VITE_SUPABASE_URL})
2. Exécuter les commandes ALTER TABLE ci-dessus
3. Créer les tables emergency_cases et whatsapp_config
4. Relancer le script pour tester les nouvelles colonnes
5. Mettre à jour l'interface React pour utiliser les nouvelles données
`);
    
    console.log('\n✅ Migration préparée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

applyMigration();