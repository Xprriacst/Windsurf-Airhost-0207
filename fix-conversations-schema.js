/**
 * Script de correction du schéma conversations
 * Supprime la contrainte NOT NULL sur la colonne property
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConversationsSchema() {
  console.log('🔧 Correction du schéma de la table conversations');
  
  try {
    // Vérifier d'abord le schéma actuel
    console.log('\n1. Vérification du schéma actuel...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, is_nullable, data_type, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'conversations' 
          AND table_schema = 'public' 
          ORDER BY ordinal_position;
        `
      });

    if (tableError) {
      console.error('Erreur lors de la vérification du schéma:', tableError);
      return;
    }

    console.log('Colonnes de la table conversations:');
    tableInfo?.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Supprimer la contrainte NOT NULL sur la colonne property si elle existe
    console.log('\n2. Suppression de la contrainte NOT NULL sur la colonne property...');
    
    const { error: alterError } = await supabase
      .rpc('sql', {
        query: 'ALTER TABLE conversations ALTER COLUMN property DROP NOT NULL;'
      });

    if (alterError) {
      console.log('Note: La contrainte NOT NULL n\'existe peut-être pas:', alterError.message);
    } else {
      console.log('✅ Contrainte NOT NULL supprimée avec succès');
    }

    // Test de création de conversation
    console.log('\n3. Test de création de conversation avec +33617370484...');
    
    const conversationData = {
      guest_name: 'Alex Test Template',
      guest_phone: '+33617370484',
      guest_number: '33617370484',
      property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
      check_in_date: '2025-06-20',
      check_out_date: '2025-06-22',
      status: 'active',
      last_message: 'Conversation créée pour test template automatique',
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert([conversationData])
      .select()
      .single();

    if (createError) {
      console.error('Erreur lors de la création de conversation:', createError);
    } else {
      console.log('✅ Conversation créée avec succès:');
      console.log(`  ID: ${newConv.id}`);
      console.log(`  Nom: ${newConv.guest_name}`);
      console.log(`  Téléphone: ${newConv.guest_phone}`);
      console.log(`  Propriété: ${newConv.property_id}`);
    }

    // Vérifier les conversations avec ce numéro
    console.log('\n4. Vérification des conversations pour +33617370484...');
    
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('guest_phone', '+33617370484');

    if (convError) {
      console.error('Erreur lors de la vérification:', convError);
    } else {
      console.log(`✅ ${conversations.length} conversation(s) trouvée(s) pour +33617370484:`);
      conversations.forEach(conv => {
        console.log(`  - ${conv.guest_name} (${conv.status}) - Propriété: ${conv.property_id}`);
      });
    }

  } catch (error) {
    console.error('Erreur lors de la correction:', error);
  }
}

fixConversationsSchema();