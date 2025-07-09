// Script pour créer 5 conversations de test pour le host Polaris IA
// Usage: node scripts/create-test-conversations.js

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// À personnaliser :
// ⚠️ IMPORTANT : Ne jamais versionner ni exposer la clé service_role
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Doit être passée via l'environnement

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';
const PROPERTY_ID = 'a0624296-4e92-469c-9be2-dcbe8ff547c2'; // Villa Côte d'Azur

const guests = [
  { name: 'Alice Test', phone: '+33600000001' },
  { name: 'Bob Démo', phone: '+33600000002' },
  { name: 'Charlie Polaris', phone: '+33600000003' },
  { name: 'Diana Testeur', phone: '+33600000004' },
  { name: 'Evan Polaris', phone: '+33600000005' }
];

async function main() {
  for (let i = 0; i < guests.length; i++) {
    const guest = guests[i];
    const now = new Date();
    const checkIn = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const checkOut = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 2);
    const lastMessageAt = new Date(now.getTime() - (i * 3600 * 1000));

    const conversation = {
      id: uuidv4(),
      guest_name: guest.name,
      guest_phone: guest.phone,
      host_id: HOST_ID,
      property_id: PROPERTY_ID,
      status: 'active',
      check_in_date: checkIn.toISOString().slice(0, 10),
      check_out_date: checkOut.toISOString().slice(0, 10),
      last_message: `Bienvenue ${guest.name} ! Ceci est une conversation de test.`,
      last_message_at: lastMessageAt.toISOString(),
      unread_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      property: [{
        name: "Villa Côte d'Azur",
        host_id: HOST_ID,
        id: PROPERTY_ID
      }],
      guest_number: null
    };

    const { error } = await supabase.from('conversations').insert([conversation]);
    if (error) {
      console.error(`❌ Erreur pour ${guest.name}:`, error.message);
    } else {
      console.log(`✅ Conversation créée pour ${guest.name}`);
      // Insérer un message de bienvenue dans la table 'messages'
      const message = {
        id: uuidv4(),
        conversation_id: conversation.id,
        content: conversation.last_message,
        direction: 'outbound',
        type: 'text',
        status: 'sent',
        created_at: now.toISOString(),
        // Ajoute d'autres champs si nécessaires selon le schéma
      };
      const { error: msgError } = await supabase.from('messages').insert([message]);
      if (msgError) {
        console.error(`❌ Erreur lors de l'insertion du message pour ${guest.name}:`, msgError.message);
      } else {
        console.log(`   ➜ Message de bienvenue inséré pour ${guest.name}`);
      }
    }
  }
  console.log('\n🎉 5 conversations de test créées pour le host Polaris IA.');
}

await main();
