import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  console.log('=== Vérification des messages ===\n');
  
  try {
    // ID de la conversation récente trouvée
    const conversationId = 'e1c49312-9ade-4af5-9b38-38dd97f7231b';
    
    console.log(`Recherche des messages pour la conversation: ${conversationId}`);
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur:', error);
    } else {
      console.log('Messages trouvés:', messages);
      console.log(`Nombre de messages: ${messages ? messages.length : 0}\n`);
      
      if (messages && messages.length > 0) {
        console.log('Détails des messages:');
        messages.forEach((msg, index) => {
          console.log(`${index + 1}. Message:`, msg);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

checkMessages();