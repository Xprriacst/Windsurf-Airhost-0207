/**
 * Test de connexion simple pour diagnostiquer le problème
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const supabaseAnonKey = process.env.PROD_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
    console.log('🔍 Test de connexion simple...');
    
    try {
        // 1. Test de connexion
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'contact.polaris.ia@gmail.com',
            password: 'Airhost123;'
        });
        
        if (error) {
            console.error('❌ Erreur de connexion:', error.message);
            console.error('Code d\'erreur:', error.status);
            return;
        }
        
        console.log('✅ Connexion réussie');
        console.log('Utilisateur:', data.user.email);
        
        // 2. Test d'accès aux données
        const { data: conversations, error: dataError } = await supabase
            .from('conversations')
            .select('id, guest_name, last_message')
            .limit(3);
            
        if (dataError) {
            console.error('❌ Erreur accès données:', dataError.message);
            return;
        }
        
        console.log('✅ Accès aux données OK');
        console.log(`Conversations trouvées: ${conversations.length}`);
        
        // 3. Déconnexion
        await supabase.auth.signOut();
        console.log('✅ Déconnexion OK');
        
        console.log('');
        console.log('🎉 Tout fonctionne correctement !');
        console.log('');
        console.log('Si vous ne pouvez pas vous connecter via l\'interface :');
        console.log('1. Videz le cache de votre navigateur');
        console.log('2. Utilisez un onglet privé/incognito');
        console.log('3. Vérifiez que vous utilisez les bons identifiants');
        console.log('');
        console.log('📋 Identifiants confirmés :');
        console.log('Email: contact.polaris.ia@gmail.com');
        console.log('Mot de passe: Airhost123;');
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
    }
}

testLogin();