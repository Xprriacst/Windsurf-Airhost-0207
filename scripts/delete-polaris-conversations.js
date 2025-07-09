// Supprime toutes les conversations de l'hôte contact.polaris.ia@gmail.com (host_id connu)
// Usage : node scripts/delete-polaris-conversations.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key requise
const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, guest_name, guest_phone')
    .eq('host_id', HOST_ID);

  if (error) {
    console.error('Erreur lors de la récupération des conversations:', error.message);
    process.exit(1);
  }
  if (!conversations.length) {
    console.log('Aucune conversation à supprimer.');
    return;
  }
  console.log(`Suppression de ${conversations.length} conversations...`);
  for (const conv of conversations) {
    const { error: delError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conv.id);
    if (delError) {
      console.error(`Erreur suppression ${conv.id} (${conv.guest_name}):`, delError.message);
    } else {
      console.log(`Conversation ${conv.id} (${conv.guest_name}, ${conv.guest_phone}) supprimée.`);
    }
  }
  console.log('Suppression terminée.');
}

main();
