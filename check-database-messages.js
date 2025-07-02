#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lire la configuration Supabase
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1];

if (!supabaseUrl || !supabaseKey) {
  console.error('Configuration Supabase manquante');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseMessages() {
  console.log('🔍 Vérification des messages et conversations dans la base de données\n');

  try {
    // 1. Vérifier les conversations récentes avec +33617370484
    console.log('1. Conversations avec +33617370484:');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .or('guest_phone.ilike.%33617370484%,guest_phone.ilike.%617370484%')
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('Erreur conversations:', convError);
    } else {
      console.log(`Trouvé ${conversations.length} conversation(s):`);
      conversations.forEach(conv => {
        console.log(`  - ID: ${conv.id}`);
        console.log(`    Téléphone: ${conv.guest_phone}`);
        console.log(`    Nom: ${conv.guest_name}`);
        console.log(`    Dernier message: ${conv.last_message?.substring(0, 50)}...`);
        console.log(`    Date: ${conv.last_message_at}`);
        console.log('');
      });
    }

    // 2. Vérifier tous les messages récents (dernières 24h)
    console.log('2. Messages récents (24h):');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_phone,
        created_at,
        conversation_analysis,
        conversation_id,
        conversations (
          guest_phone,
          guest_name
        )
      `)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (msgError) {
      console.error('Erreur messages:', msgError);
    } else {
      console.log(`Trouvé ${messages.length} message(s) récent(s):`);
      messages.forEach(msg => {
        console.log(`  - Message ID: ${msg.id}`);
        console.log(`    De: ${msg.sender_phone}`);
        console.log(`    Conversation: ${msg.conversations?.guest_phone} (${msg.conversations?.guest_name})`);
        console.log(`    Contenu: ${msg.content?.substring(0, 50)}...`);
        console.log(`    Analyse: ${msg.conversation_analysis}`);
        console.log(`    Date: ${msg.created_at}`);
        console.log('');
      });
    }

    // 3. Vérifier s'il y a des incohérences
    console.log('3. Vérification des incohérences:');
    
    // Messages avec téléphone différent de la conversation
    const { data: inconsistent, error: inconsistentError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_phone,
        conversation_id,
        conversations (
          guest_phone,
          guest_name
        )
      `)
      .gte('created_at', yesterday.toISOString());

    if (!inconsistentError && inconsistent) {
      const problems = inconsistent.filter(msg => 
        msg.sender_phone && msg.conversations?.guest_phone && 
        !msg.conversations.guest_phone.includes(msg.sender_phone.replace('+', ''))
      );

      if (problems.length > 0) {
        console.log(`⚠️  Trouvé ${problems.length} incohérence(s):`);
        problems.forEach(prob => {
          console.log(`  - Message de ${prob.sender_phone} dans conversation ${prob.conversations.guest_phone}`);
        });
      } else {
        console.log('✅ Aucune incohérence détectée');
      }
    }

    // 4. Messages liés à contact.polaris.ia@gmail.com
    console.log('4. Messages liés à contact.polaris.ia@gmail.com:');
    const { data: emailMessages, error: emailError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_phone,
        created_at,
        conversations (
          guest_phone,
          guest_name,
          guest_email
        )
      `)
      .gte('created_at', yesterday.toISOString());

    if (!emailError && emailMessages) {
      const emailRelated = emailMessages.filter(msg => 
        msg.conversations?.guest_email?.includes('contact.polaris.ia@gmail.com') ||
        msg.content?.includes('contact.polaris.ia@gmail.com')
      );

      console.log(`Trouvé ${emailRelated.length} message(s) lié(s) à cet email:`);
      emailRelated.forEach(msg => {
        console.log(`  - De: ${msg.sender_phone}`);
        console.log(`    Email conversation: ${msg.conversations?.guest_email}`);
        console.log(`    Contenu: ${msg.content?.substring(0, 50)}...`);
      });
    }

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

checkDatabaseMessages();