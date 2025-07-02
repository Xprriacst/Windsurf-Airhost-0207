#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration Supabase
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConversationMapping() {
  console.log('🔧 Correction du mapping des conversations\n');

  try {
    // 1. Examiner le schéma des tables
    console.log('1. Schéma de la table messages:');
    const { data: messageColumns, error: msgSchemaError } = await supabase.rpc('get_table_columns', {
      table_name: 'messages'
    });

    if (msgSchemaError) {
      console.log('Tentative alternative pour le schéma...');
      // Essayer une requête simple pour voir les colonnes disponibles
      const { data: sampleMessage, error: sampleError } = await supabase
        .from('messages')
        .select('*')
        .limit(1);
      
      if (!sampleError && sampleMessage && sampleMessage.length > 0) {
        console.log('Colonnes disponibles dans messages:', Object.keys(sampleMessage[0]));
      } else {
        console.error('Erreur échantillon:', sampleError);
      }
    } else {
      console.log('Colonnes messages:', messageColumns);
    }

    // 2. Vérifier les messages récents avec les bonnes colonnes
    console.log('\n2. Messages récents (utilisant les colonnes correctes):');
    const { data: recentMessages, error: recentError } = await supabase
      .from('messages')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('Erreur messages récents:', recentError);
    } else {
      console.log(`Trouvé ${recentMessages.length} message(s) récent(s):`);
      recentMessages.forEach(msg => {
        console.log(`  ID: ${msg.id}`);
        console.log(`  Contenu: ${msg.content?.substring(0, 50)}...`);
        console.log(`  Conversation ID: ${msg.conversation_id}`);
        console.log(`  Date: ${msg.created_at}`);
        console.log('');
      });
    }

    // 3. Vérifier si la conversation "ALEX TEST" reçoit bien les nouveaux messages
    console.log('3. Vérification conversation ALEX TEST:');
    const alexConversationId = 'b0c3a5ab-5c52-471d-a08a-bb17aceb51e0';
    
    const { data: alexMessages, error: alexError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', alexConversationId)
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      .order('created_at', { ascending: false });

    if (alexError) {
      console.error('Erreur messages Alex:', alexError);
    } else {
      console.log(`Messages dans conversation ALEX TEST (24h): ${alexMessages.length}`);
      alexMessages.forEach(msg => {
        console.log(`  ${msg.content?.substring(0, 60)}... - ${msg.created_at}`);
      });
    }

    // 4. Créer une nouvelle conversation pour contact.polaris.ia@gmail.com
    console.log('\n4. Création nouvelle conversation pour contact.polaris.ia@gmail.com:');
    
    // D'abord vérifier s'il existe déjà une conversation avec cet email
    const { data: existingEmailConv, error: emailSearchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('guest_phone', '+33617370484')
      .neq('id', alexConversationId);

    if (!emailSearchError && existingEmailConv.length > 0) {
      console.log('Conversation alternative trouvée:', existingEmailConv[0].id);
    } else {
      // Créer une nouvelle conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          guest_phone: '+33617370484',
          guest_name: 'Contact Polaris IA',
          guest_email: 'contact.polaris.ia@gmail.com',
          last_message: 'Nouvelle conversation créée',
          last_message_at: new Date().toISOString(),
          host_id: 'a2ce1797-a5ab-4c37-9512-4a405e0f1c7',
          property_id: null
        })
        .select()
        .single();

      if (createError) {
        console.error('Erreur création conversation:', createError);
      } else {
        console.log('Nouvelle conversation créée:', newConversation.id);
        
        // 5. Transférer les messages récents vers la nouvelle conversation
        console.log('\n5. Transfert des messages récents:');
        const { data: transferResult, error: transferError } = await supabase
          .from('messages')
          .update({ conversation_id: newConversation.id })
          .eq('conversation_id', alexConversationId)
          .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());

        if (transferError) {
          console.error('Erreur transfert:', transferError);
        } else {
          console.log('Messages transférés avec succès');
          
          // Mettre à jour la nouvelle conversation avec le dernier message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', newConversation.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (lastMessage && lastMessage.length > 0) {
            await supabase
              .from('conversations')
              .update({
                last_message: lastMessage[0].content,
                last_message_at: lastMessage[0].created_at
              })
              .eq('id', newConversation.id);
          }
        }
      }
    }

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

fixConversationMapping();