#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2NTUwMiwiZXhwIjoyMDYzMjQxNTAyfQ.DPKTpahAzRv1X3crxS81XhmLSzbW8fUbAQ22Ru0GFdc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Vérification du schéma de la table conversations...');

  try {
    // Récupérer une conversation existante pour voir les colonnes disponibles
    const { data: sampleConversation, error } = await supabase
      .from('conversations')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Erreur:', error);
      return;
    }

    console.log('📋 Colonnes disponibles dans la table conversations:');
    Object.keys(sampleConversation).forEach(key => {
      console.log(`- ${key}: ${typeof sampleConversation[key]} = ${sampleConversation[key]}`);
    });

    // Créer une nouvelle conversation simple
    console.log('\n🔧 Création de la conversation Contact Polaris IA...');
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        guest_phone: '+33617370484',
        guest_number: '+33617370484', // Colonne requise
        guest_name: 'Contact Polaris IA',
        property_id: sampleConversation.property_id,
        status: 'active',
        last_message: 'Conversation Contact Polaris IA créée - tous vos messages WhatsApp apparaîtront ici',
        last_message_at: new Date().toISOString(),
        unread_count: 1
      })
      .select()
      .single();

    if (createError) {
      console.error('Erreur création:', createError);
    } else {
      console.log('✅ Conversation créée:', newConv.id);
    }

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

checkSchema();