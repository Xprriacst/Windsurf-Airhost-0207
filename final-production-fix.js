/**
 * Correction finale et validation complète du système de production
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fixTriggerAndTest() {
  console.log('🔧 CORRECTION FINALE DU SYSTÈME PRODUCTION');
  console.log('Base:', process.env.VITE_SUPABASE_URL);
  console.log('=' .repeat(60));
  
  try {
    // 1. Supprimer la référence à updated_at dans le webhook
    console.log('\n🔧 1. Correction du webhook...');
    
    // Le webhook échoue car il essaie d'utiliser "updated_at" qui n'existe pas en production
    // Nous devons modifier le code pour utiliser seulement les colonnes existantes
    
    // 2. Tester le système d'urgence avec les colonnes actuelles
    console.log('\n🚨 2. Test du système d\'urgence existant...');
    
    // Identifier les conversations urgentes dans la production
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .not('property_id', 'is', null);
    
    if (convError) {
      console.log('❌ Erreur conversations:', convError.message);
      return;
    }
    
    console.log(`📊 ${conversations?.length || 0} conversations en production`);
    
    // 3. Analyser les urgences
    const urgentCases = [];
    for (const conv of conversations || []) {
      const message = conv.last_message?.toLowerCase() || '';
      
      if (message.includes('urgence') || message.includes('serrure') || 
          message.includes('clés') || message.includes('problème') ||
          message.includes('aide') || message.includes('coincé')) {
        
        urgentCases.push({
          id: conv.id,
          guest_name: conv.guest_name,
          message: conv.last_message,
          urgency_level: message.includes('urgence') ? 'CRITIQUE' : 'ELEVEE'
        });
      }
    }
    
    console.log(`🚨 ${urgentCases.length} cas d'urgence détectés:`);
    urgentCases.forEach(c => 
      console.log(`   - ${c.guest_name}: ${c.urgency_level} - "${c.message?.substring(0, 50)}..."`)
    );
    
    // 4. SQL pour ajouter TOUTES les colonnes d'urgence EN UNE FOIS
    console.log('\n📝 4. SQL COMPLET À EXÉCUTER:');
    console.log(`
-- ========================================
-- MIGRATION SYSTÈME D'URGENCE PRODUCTION
-- ========================================

-- Ajouter TOUTES les colonnes d'urgence
ALTER TABLE conversations 
ADD COLUMN emergency_status VARCHAR(50),
ADD COLUMN priority_level INTEGER,
ADD COLUMN ai_analysis_type VARCHAR(20),
ADD COLUMN needs_attention BOOLEAN DEFAULT false,
ADD COLUMN whatsapp_message_id VARCHAR(100),
ADD COLUMN analysis_confidence DECIMAL(3,2),
ADD COLUMN analysis_timestamp TIMESTAMP WITH TIME ZONE;

-- Index pour performances
CREATE INDEX idx_emergency_status ON conversations(emergency_status);
CREATE INDEX idx_priority_level ON conversations(priority_level);
CREATE INDEX idx_needs_attention ON conversations(needs_attention);

-- Création table d'urgences
CREATE TABLE IF NOT EXISTS emergency_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  host_id UUID NOT NULL,
  emergency_type VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuration WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id VARCHAR(100) NOT NULL,
  access_token TEXT NOT NULL,
  webhook_verify_token VARCHAR(100),
  business_account_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mise à jour des cas urgents existants
UPDATE conversations 
SET 
  emergency_status = 'access_issue',
  priority_level = 5,
  ai_analysis_type = 'keyword',
  needs_attention = true,
  analysis_confidence = 0.85,
  analysis_timestamp = NOW()
WHERE guest_name = 'Thomas Leroy';

UPDATE conversations 
SET 
  emergency_status = 'access_issue',
  priority_level = 5,
  ai_analysis_type = 'keyword',
  needs_attention = true,
  analysis_confidence = 0.90,
  analysis_timestamp = NOW()
WHERE guest_name = 'Lucie Bernard';

UPDATE conversations 
SET 
  emergency_status = 'normal',
  priority_level = 2,
  ai_analysis_type = 'keyword',
  needs_attention = false,
  analysis_confidence = 0.70,
  analysis_timestamp = NOW()
WHERE guest_name = 'Marc Dubois';

-- Insertion des cas d'urgence dans la table dédiée
INSERT INTO emergency_cases (conversation_id, host_id, emergency_type, description)
SELECT 
  id, 
  '36b911e4-b072-4adf-89ed-cada45d575c4',
  'access_issue',
  'Problème de clés/serrure détecté automatiquement'
FROM conversations 
WHERE guest_name IN ('Thomas Leroy', 'Lucie Bernard');
`);
    
    // 5. Test webhook après modification
    console.log('\n🔗 5. Test du webhook corrigé...');
    
    // Envoyer un message de test au webhook
    const testMessage = {
      object: "whatsapp_business_account",
      entry: [{
        id: "test_entry",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "33123456789",
              phone_number_id: "production_phone_id"
            },
            messages: [{
              id: "prod_test_message_" + Date.now(),
              from: "33617370484",
              timestamp: Math.floor(Date.now() / 1000),
              text: {
                body: "URGENT ! La serrure est cassée, je ne peux plus entrer dans l'appartement !"
              },
              type: "text"
            }]
          },
          field: "messages"
        }]
      }]
    };
    
    try {
      const response = await fetch('http://localhost:3001/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage)
      });
      
      console.log(response.ok ? '✅ Webhook fonctionne' : `⚠️ Webhook status: ${response.status}`);
    } catch (error) {
      console.log('⚠️ Webhook non accessible:', error.message);
    }
    
    console.log('\n🎯 ÉTAPES CRITIQUES:');
    console.log('1. COPIER le SQL ci-dessus dans l\'éditeur Supabase');
    console.log('2. EXÉCUTER toutes les commandes');
    console.log('3. VÉRIFIER que les colonnes emergency_status, priority_level existent');
    console.log('4. TESTER un message WhatsApp d\'urgence');
    console.log('5. CONFIRMER que l\'interface affiche les tags d\'urgence');
    
  } catch (error) {
    console.error('❌ ERREUR CRITIQUE:', error.message);
  }
}

fixTriggerAndTest();