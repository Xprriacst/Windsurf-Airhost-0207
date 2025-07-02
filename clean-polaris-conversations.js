/**
 * Script pour supprimer toutes les conversations de contact.polaris.ia@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
    console.error('Vérifiez VITE_SUPABASE_URL et DEV_SUPABASE_SERVICE_ROLE_KEY dans .env');
    process.exit(1);
}

// Client Supabase avec clé service
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ID utilisateur Polaris corrigé
const POLARIS_USER_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function cleanPolarisConversations() {
    try {
        console.log('🔍 Recherche des conversations de contact.polaris.ia@gmail.com...');
        
        // Récupérer toutes les conversations liées à l'utilisateur Polaris
        const { data: conversations, error: fetchError } = await supabase
            .from('conversations')
            .select('id, guest_name, guest_phone, created_at')
            .eq('host_id', POLARIS_USER_ID);

        if (fetchError) {
            console.error('❌ Erreur lors de la récupération:', fetchError);
            return;
        }

        if (!conversations || conversations.length === 0) {
            console.log('✅ Aucune conversation trouvée pour contact.polaris.ia@gmail.com');
            return;
        }

        console.log(`📋 ${conversations.length} conversation(s) trouvée(s):`);
        conversations.forEach((conv, index) => {
            console.log(`   ${index + 1}. ${conv.guest_name} (${conv.guest_phone}) - ${conv.created_at}`);
        });

        // Récupérer les IDs des conversations
        const conversationIds = conversations.map(conv => conv.id);

        console.log('\n🗑️ Suppression des messages associés...');
        
        // Supprimer d'abord les messages liés à ces conversations
        const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .in('conversation_id', conversationIds);

        if (messagesError) {
            console.error('❌ Erreur lors de la suppression des messages:', messagesError);
            return;
        }

        console.log('✅ Messages supprimés avec succès');

        console.log('🗑️ Suppression des conversations...');
        
        // Supprimer les conversations
        const { error: conversationsError } = await supabase
            .from('conversations')
            .delete()
            .eq('host_id', POLARIS_USER_ID);

        if (conversationsError) {
            console.error('❌ Erreur lors de la suppression des conversations:', conversationsError);
            return;
        }

        console.log(`✅ ${conversations.length} conversation(s) de contact.polaris.ia@gmail.com supprimée(s) avec succès`);

        // Vérification finale
        const { data: verification, error: verifyError } = await supabase
            .from('conversations')
            .select('id')
            .eq('host_id', POLARIS_USER_ID);

        if (verifyError) {
            console.error('❌ Erreur lors de la vérification:', verifyError);
            return;
        }

        if (verification && verification.length === 0) {
            console.log('✅ Vérification: Aucune conversation restante pour contact.polaris.ia@gmail.com');
        } else {
            console.log(`⚠️ Attention: ${verification.length} conversation(s) encore présente(s)`);
        }

    } catch (error) {
        console.error('❌ Erreur générale:', error);
    }
}

// Exécuter le script
console.log('🧹 Nettoyage des conversations Polaris');
console.log('=====================================');
cleanPolarisConversations();