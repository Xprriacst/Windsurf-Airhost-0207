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

async function checkConversations() {
  console.log('=== Vérification des conversations ===\n');
  
  try {
    // Requête 1: Conversation spécifique
    console.log('1. Recherche de conversation spécifique (host_id + guest_phone):');
    const { data: specificConv, error: error1 } = await supabase
      .from('conversations')
      .select('id, host_id, guest_name, guest_phone, property_id, status, created_at, last_message_at')
      .eq('host_id', 'ccb6fe09-a88a-4de3-9050-f9162ba6c28d')
      .eq('guest_phone', '+3361233335')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error1) {
      console.error('Erreur requête 1:', error1);
    } else {
      console.log('Résultats:', specificConv);
      console.log(`Nombre de conversations trouvées: ${specificConv ? specificConv.length : 0}\n`);
    }

    // Requête 2: Conversations récentes (10 dernières minutes)
    console.log('2. Conversations créées dans les 10 dernières minutes:');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: recentConv, error: error2 } = await supabase
      .from('conversations')
      .select('id, host_id, guest_name, guest_phone, property_id, status, created_at')
      .eq('host_id', 'ccb6fe09-a88a-4de3-9050-f9162ba6c28d')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });

    if (error2) {
      console.error('Erreur requête 2:', error2);
    } else {
      console.log('Résultats:', recentConv);
      console.log(`Nombre de conversations récentes: ${recentConv ? recentConv.length : 0}\n`);
    }

    // Requête 3: Toutes les conversations pour ce host (dernières 5)
    console.log('3. Dernières 5 conversations pour ce host:');
    const { data: allConv, error: error3 } = await supabase
      .from('conversations')
      .select('id, host_id, guest_name, guest_phone, property_id, status, created_at')
      .eq('host_id', 'ccb6fe09-a88a-4de3-9050-f9162ba6c28d')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error3) {
      console.error('Erreur requête 3:', error3);
    } else {
      console.log('Résultats:', allConv);
      console.log(`Nombre total de conversations (top 5): ${allConv ? allConv.length : 0}\n`);
    }

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

checkConversations();