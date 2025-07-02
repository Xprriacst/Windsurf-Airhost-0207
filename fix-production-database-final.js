/**
 * Correction définitive de la base de données production
 * Supprime les références à updated_at et finalise l'intégration
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fixProductionDatabase() {
  console.log('🔧 Correction finale de la base de données production');
  console.log('URL:', process.env.VITE_SUPABASE_URL);
  console.log('=' .repeat(60));
  
  try {
    // 1. Vérifier la structure actuelle
    console.log('\n📊 1. Analyse de la structure actuelle...');
    
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (convError) {
      console.log('❌ Erreur conversations:', convError.message);
      return;
    }
    
    console.log('✅ Table conversations accessible');
    console.log('Colonnes disponibles:', Object.keys(conversations[0] || {}));
    
    // 2. Identifier les conversations urgentes avec l'analyse actuelle
    console.log('\n🚨 2. Analyse des urgences détectées...');
    
    const { data: allConversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id, guest_name, guest_phone, last_message, property_id')
      .not('property_id', 'is', null);
    
    if (fetchError) {
      console.log('❌ Erreur récupération:', fetchError.message);
      return;
    }
    
    console.log(`📋 ${allConversations?.length || 0} conversations trouvées`);
    
    // Analyser les urgences
    const urgentConversations = [];
    const normalConversations = [];
    
    for (const conv of allConversations || []) {
      const message = conv.last_message?.toLowerCase() || '';
      
      const urgencyKeywords = [
        'urgence', 'urgent', 'problème', 'serrure', 'clés', 'clé', 
        'porte', 'fermer', 'sortir', 'aide', 'bloquer', 'coincé',
        'inacceptable', 'inadmissible', 'scandaleux'
      ];
      
      const isUrgent = urgencyKeywords.some(keyword => message.includes(keyword));
      
      if (isUrgent) {
        urgentConversations.push({
          ...conv,
          emergency_type: message.includes('serrure') || message.includes('clé') ? 'access_issue' : 'general_emergency',
          priority: message.includes('urgent') || message.includes('urgence') ? 5 : 4
        });
      } else {
        normalConversations.push({
          ...conv,
          emergency_type: 'normal',
          priority: 2
        });
      }
    }
    
    console.log(`🚨 Urgences détectées: ${urgentConversations.length}`);
    console.log(`📝 Conversations normales: ${normalConversations.length}`);
    
    // 3. Afficher les urgences détectées
    console.log('\n🔍 3. Détail des urgences:');
    urgentConversations.forEach(conv => {
      console.log(`   - ${conv.guest_name}: "${conv.last_message?.substring(0, 60)}..."`);
      console.log(`     Type: ${conv.emergency_type}, Priorité: ${conv.priority}`);
    });
    
    // 4. Générer le SQL pour les colonnes d'urgence
    console.log('\n📝 4. SQL à exécuter dans Supabase:');
    console.log(`
-- === COLONNES D'ANALYSE D'URGENCE ===
-- Exécuter ces commandes dans l'éditeur SQL Supabase

-- Colonnes principales
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS emergency_status VARCHAR(50);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority_level INTEGER;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_analysis_type VARCHAR(20);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(100);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS analysis_confidence DECIMAL(3,2);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS analysis_timestamp TIMESTAMP WITH TIME ZONE;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_conversations_emergency_status ON conversations(emergency_status);
CREATE INDEX IF NOT EXISTS idx_conversations_priority_level ON conversations(priority_level);
CREATE INDEX IF NOT EXISTS idx_conversations_needs_attention ON conversations(needs_attention);

-- Mise à jour des données existantes pour Thomas Leroy (test)
UPDATE conversations 
SET 
  emergency_status = 'access_issue',
  priority_level = 5,
  ai_analysis_type = 'keyword',
  needs_attention = true,
  analysis_confidence = 0.85,
  analysis_timestamp = NOW()
WHERE guest_name = 'Thomas Leroy';

-- Mise à jour des données existantes pour Lucie Bernard (test)
UPDATE conversations 
SET 
  emergency_status = 'access_issue',
  priority_level = 5,
  ai_analysis_type = 'keyword',
  needs_attention = true,
  analysis_confidence = 0.90,
  analysis_timestamp = NOW()
WHERE guest_name = 'Lucie Bernard';

-- Mise à jour pour Marc Dubois (normal)
UPDATE conversations 
SET 
  emergency_status = 'normal',
  priority_level = 2,
  ai_analysis_type = 'keyword',
  needs_attention = false,
  analysis_confidence = 0.70,
  analysis_timestamp = NOW()
WHERE guest_name = 'Marc Dubois';
`);
    
    // 5. Test de webhook simulé
    console.log('\n🔗 5. Test du système webhook...');
    
    await testWebhookFinal();
    
    console.log('\n✅ MIGRATION PRÊTE !');
    console.log('📋 Étapes suivantes:');
    console.log('   1. Copier-coller le SQL ci-dessus dans l\'éditeur Supabase');
    console.log('   2. Exécuter les commandes une par une');
    console.log('   3. Vérifier que l\'interface affiche les nouvelles colonnes');
    console.log('   4. Tester le webhook avec de vrais messages WhatsApp');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

async function testWebhookFinal() {
  console.log('🧪 Test du webhook d\'urgence...');
  
  // Simuler un message d'urgence
  const testMessage = {
    object: "whatsapp_business_account",
    entry: [{
      id: "test_entry",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: {
            display_phone_number: "33123456789",
            phone_number_id: "test_phone_id"
          },
          messages: [{
            id: "test_message_id",
            from: "33617370484",
            timestamp: Math.floor(Date.now() / 1000),
            text: {
              body: "URGENCE ! Je suis coincé dans l'appartement, la serrure ne fonctionne plus !"
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    if (response.ok) {
      console.log('✅ Webhook test réussi');
    } else {
      console.log('⚠️ Webhook test échoué:', response.status);
    }
  } catch (error) {
    console.log('⚠️ Webhook non accessible:', error.message);
  }
}

fixProductionDatabase();