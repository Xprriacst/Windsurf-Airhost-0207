/**
 * Setup user account in production database
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PROD_SUPABASE_URL;
const supabaseServiceKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUserAccount() {
    console.log('🔧 Configuration du compte utilisateur production...');
    
    try {
        // 1. Créer l'utilisateur avec le service role
        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email: 'contact.polaris.ia@gmail.com',
            password: 'Airhost123;',
            email_confirm: true
        });
        
        if (createError) {
            if (createError.message.includes('already registered') || createError.code === 'email_exists') {
                console.log('✅ Utilisateur existe déjà');
                
                // Récupérer l'utilisateur existant
                const { data: users, error: listError } = await supabase.auth.admin.listUsers();
                if (listError) {
                    console.error('❌ Erreur récupération utilisateur:', listError);
                    return;
                }
                
                const existingUser = users.users.find(u => u.email === 'contact.polaris.ia@gmail.com');
                if (!existingUser) {
                    console.error('❌ Utilisateur non trouvé');
                    return;
                }
                
                // Mettre à jour le mot de passe et confirmer l'email
                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    existingUser.id,
                    { 
                        password: 'Airhost123;',
                        email_confirm: true
                    }
                );
                
                if (updateError) {
                    console.log('⚠️ Impossible de mettre à jour l\'utilisateur:', updateError.message);
                } else {
                    console.log('✅ Mot de passe mis à jour et email confirmé');
                }
            } else {
                console.error('❌ Erreur création utilisateur:', createError);
                return;
            }
        } else {
            console.log('✅ Utilisateur créé:', user.user.email);
        }
        
        // 2. Vérifier que l'utilisateur peut se connecter
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'contact.polaris.ia@gmail.com',
            password: 'Airhost123;'
        });
        
        if (authError) {
            console.error('❌ Test de connexion échoué:', authError.message);
            return;
        }
        
        console.log('✅ Test de connexion réussi');
        
        // 3. Créer/vérifier le profil host
        const { data: hostData, error: hostError } = await supabase
            .from('hosts')
            .select('id, email')
            .eq('email', 'contact.polaris.ia@gmail.com')
            .single();
            
        if (hostError && hostError.code === 'PGRST116') {
            // Créer le profil host
            const { data: newHost, error: createHostError } = await supabase
                .from('hosts')
                .insert({
                    id: authData.user.id,
                    email: 'contact.polaris.ia@gmail.com',
                    name: 'Contact Polaris IA',
                    phone_number_id: '477925252079395',
                    whatsapp_access_token: 'test-token',
                    verify_token: 'airhost_webhook_verify_2024'
                })
                .select()
                .single();
                
            if (createHostError) {
                console.error('❌ Erreur création host:', createHostError);
            } else {
                console.log('✅ Profil host créé:', newHost.email);
            }
        } else if (hostError) {
            console.error('❌ Erreur vérification host:', hostError);
        } else {
            console.log('✅ Profil host existe:', hostData.email);
        }
        
        console.log('');
        console.log('🎉 Configuration utilisateur terminée !');
        console.log('');
        console.log('📋 Identifiants de connexion:');
        console.log('Email: contact.polaris.ia@gmail.com');
        console.log('Mot de passe: Airhost123;');
        console.log('');
        console.log('✅ Vous pouvez maintenant vous connecter à l\'interface');
        
    } catch (error) {
        console.error('❌ Erreur générale:', error);
    }
}

createUserAccount();