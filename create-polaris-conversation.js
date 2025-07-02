#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2NTUwMiwiZXhwIjoyMDYzMjQxNTAyfQ.DPKTpahAzRv1X3crxS81XhmLSzbW8fUbAQ22Ru0GFdc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPolarisConversation() {
  console.log('🔧 Création forcée de la conversation Contact Polaris IA...\n');

  try {
    // 1. Supprimer l'ancienne conversation ALEX TEST si elle existe
    console.log('1. Suppression de l\'ancienne conversation ALEX TEST...');
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('guest_phone', '+33617370484')
      .eq('guest_name', 'ALEX TEST');

    if (deleteError) {
      console.log('Aucune conversation ALEX TEST à supprimer ou erreur:', deleteError.message);
    } else {
      console.log('✅ Conversation ALEX TEST supprimée');
    }

    // 2. Obtenir une propriété pour la conversation
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, host_id')
      .limit(1)
      .single();

    if (propError || !property) {
      console.error('Erreur récupération propriété:', propError);
      return;
    }

    console.log('✅ Propriété trouvée:', property.id);

    // 3. Créer la nouvelle conversation Contact Polaris IA
    console.log('2. Création de la nouvelle conversation Contact Polaris IA...');
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        guest_phone: '+33617370484',
        guest_name: 'Contact Polaris IA',
        property_id: property.id,
        host_id: property.host_id,
        status: 'active',
        last_message: 'Conversation créée pour Contact Polaris IA',
        last_message_at: new Date().toISOString(),
        unread_count: 0
      })
      .select()
      .single();

    if (createError) {
      console.error('Erreur création conversation:', createError);
      return;
    }

    console.log('✅ Nouvelle conversation créée:');
    console.log('   ID:', newConversation.id);
    console.log('   Nom:', newConversation.guest_name);
    console.log('   Téléphone:', newConversation.guest_phone);

    // 4. Ajouter un message initial
    console.log('3. Ajout d\'un message initial...');
    const { data: firstMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: newConversation.id,
        content: 'Bonjour ! Cette conversation est dédiée aux échanges avec Contact Polaris IA. Tous vos messages WhatsApp depuis +33617370484 apparaîtront ici.',
        sender_type: 'system',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Erreur création message:', messageError);
    } else {
      console.log('✅ Message initial créé');
    }

    // 5. Mettre à jour la conversation avec le message
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message: 'Bonjour ! Cette conversation est dédiée aux échanges avec Contact Polaris IA...',
        last_message_at: new Date().toISOString()
      })
      .eq('id', newConversation.id);

    if (updateError) {
      console.error('Erreur mise à jour conversation:', updateError);
    } else {
      console.log('✅ Conversation mise à jour');
    }

    console.log('\n🎉 Conversation Contact Polaris IA créée avec succès !');
    console.log('📱 Vérifiez votre interface sur http://localhost:5001');
    console.log('🔄 L\'interface devrait se mettre à jour automatiquement');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createPolarisConversation();