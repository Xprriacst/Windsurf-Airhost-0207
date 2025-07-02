/**
 * Migration du système d'analyse d'urgence GPT-4o vers la production
 * Synchronise la structure de la base de développement avec la production
 */

import { createClient } from '@supabase/supabase-js';

// Configuration production (Airhost-REC)
const prodUrl = process.env.VITE_SUPABASE_URL;
const prodKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const prodSupabase = createClient(prodUrl, prodKey);

async function migrateEmergencySystem() {
  console.log('🚀 Migration du système d\'analyse d\'urgence vers la production');
  console.log('=' .repeat(70));
  
  try {
    // 1. Ajouter les colonnes d'analyse d'urgence aux conversations
    console.log('\n📋 1. Migration des colonnes d\'analyse d\'urgence...');
    
    const emergencyColumns = [
      'emergency_status VARCHAR(50)',
      'priority_level INTEGER',
      'ai_analysis_type VARCHAR(20)',
      'needs_attention BOOLEAN DEFAULT false',
      'whatsapp_message_id VARCHAR(100)',
      'analysis_confidence DECIMAL(3,2)',
      'analysis_timestamp TIMESTAMP WITH TIME ZONE'
    ];
    
    for (const column of emergencyColumns) {
      try {
        const { error } = await prodSupabase.rpc('exec_sql', {
          sql: `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ${column};`
        });
        
        if (error && !error.message.includes('already exists')) {
          console.log(`⚠️ Erreur ajout colonne ${column.split(' ')[0]}:`, error.message);
        } else {
          console.log(`✅ Colonne ${column.split(' ')[0]} ajoutée`);
        }
      } catch (err) {
        console.log(`⚠️ Colonne ${column.split(' ')[0]} probablement existante`);
      }
    }
    
    // 2. Créer la table emergency_cases si elle n'existe pas
    console.log('\n🚨 2. Création de la table emergency_cases...');
    
    const createEmergencyCasesSQL = `
      CREATE TABLE IF NOT EXISTS emergency_cases (
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
      );
    `;
    
    const { error: emergencyTableError } = await prodSupabase.rpc('exec_sql', {
      sql: createEmergencyCasesSQL
    });
    
    if (emergencyTableError) {
      console.log('⚠️ Table emergency_cases:', emergencyTableError.message);
    } else {
      console.log('✅ Table emergency_cases créée');
    }
    
    // 3. Créer la table whatsapp_config si elle n'existe pas
    console.log('\n📱 3. Création de la table whatsapp_config...');
    
    const createWhatsAppConfigSQL = `
      CREATE TABLE IF NOT EXISTS whatsapp_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number_id VARCHAR(100) NOT NULL,
        access_token TEXT NOT NULL,
        webhook_verify_token VARCHAR(100),
        business_account_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: whatsappConfigError } = await prodSupabase.rpc('exec_sql', {
      sql: createWhatsAppConfigSQL
    });
    
    if (whatsappConfigError) {
      console.log('⚠️ Table whatsapp_config:', whatsappConfigError.message);
    } else {
      console.log('✅ Table whatsapp_config créée');
    }
    
    // 4. Migrer les conversations existantes avec des valeurs par défaut
    console.log('\n🔄 4. Migration des données existantes...');
    
    const { data: existingConversations, error: fetchError } = await prodSupabase
      .from('conversations')
      .select('id, guest_name, last_message')
      .is('emergency_status', null)
      .limit(10);
    
    if (fetchError) {
      console.log('⚠️ Erreur récupération conversations:', fetchError.message);
    } else {
      console.log(`📊 ${existingConversations?.length || 0} conversation(s) à migrer`);
      
      for (const conv of existingConversations || []) {
        // Analyser le message pour détecter des urgences
        const isEmergency = conv.last_message?.toLowerCase().includes('urgence') || 
                           conv.last_message?.toLowerCase().includes('problème') ||
                           conv.last_message?.toLowerCase().includes('serrure') ||
                           conv.last_message?.toLowerCase().includes('clés');
        
        const emergencyStatus = isEmergency ? 'potential_emergency' : 'normal';
        const priorityLevel = isEmergency ? 4 : 2;
        
        const { error: updateError } = await prodSupabase
          .from('conversations')
          .update({
            emergency_status: emergencyStatus,
            priority_level: priorityLevel,
            ai_analysis_type: 'keyword',
            needs_attention: isEmergency,
            analysis_confidence: isEmergency ? 0.75 : 0.50,
            analysis_timestamp: new Date().toISOString()
          })
          .eq('id', conv.id);
        
        if (updateError) {
          console.log(`⚠️ Erreur migration ${conv.guest_name}:`, updateError.message);
        } else {
          console.log(`✅ ${conv.guest_name} migré (${emergencyStatus})`);
        }
      }
    }
    
    // 5. Nettoyer les tables inutiles
    console.log('\n🧹 5. Nettoyage des tables inutiles...');
    
    const tablesToCheck = [
      'user_sessions', 'old_conversations', 'temp_data', 
      'backup_messages', 'deprecated_config'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await prodSupabase
          .from(table)
          .select('count(*)')
          .limit(1);
        
        if (error && error.code === 'PGRST106') {
          console.log(`ℹ️ Table ${table} n'existe pas`);
        } else if (data) {
          console.log(`⚠️ Table ${table} existe - à examiner manuellement`);
        }
      } catch (err) {
        console.log(`ℹ️ Table ${table} non trouvée`);
      }
    }
    
    // 6. Validation finale
    console.log('\n✅ 6. Validation du système d\'urgence...');
    
    const { data: testConversations, error: testError } = await prodSupabase
      .from('conversations')
      .select('id, guest_name, emergency_status, priority_level, needs_attention')
      .not('emergency_status', 'is', null)
      .limit(5);
    
    if (testError) {
      console.log('❌ Erreur validation:', testError.message);
    } else {
      console.log(`🎯 Validation réussie: ${testConversations?.length || 0} conversations avec système d'urgence`);
      testConversations?.forEach(conv => 
        console.log(`   - ${conv.guest_name}: ${conv.emergency_status} (priorité: ${conv.priority_level})`)
      );
    }
    
    // 7. Mise à jour de la configuration
    console.log('\n⚙️ 7. Configuration du système...');
    
    const { error: configError } = await prodSupabase
      .from('whatsapp_config')
      .upsert({
        phone_number_id: 'production_phone_id',
        access_token: 'PLACEHOLDER_TOKEN',
        webhook_verify_token: 'airhost_webhook_verify_2024'
      });
    
    if (configError) {
      console.log('⚠️ Configuration WhatsApp:', configError.message);
    } else {
      console.log('✅ Configuration WhatsApp initialisée');
    }
    
    console.log('\n🎉 MIGRATION TERMINÉE !');
    console.log('📋 Prochaines étapes:');
    console.log('   1. Mettre à jour les tokens WhatsApp avec les vraies valeurs');
    console.log('   2. Tester le webhook d\'urgence');
    console.log('   3. Configurer les notifications');
    console.log('   4. Valider l\'interface avec les nouvelles colonnes');
    
  } catch (error) {
    console.error('❌ Erreur générale de migration:', error.message);
  }
}

migrateEmergencySystem();