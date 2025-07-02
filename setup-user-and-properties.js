/**
 * Configuration complète utilisateur et système de propriétés
 * Crée l'utilisateur dans la table publique et configure les propriétés
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PROD_SUPABASE_URL;
const serviceKey = process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

// ID utilisateur de la session active
const userId = 'ff1818e7-9a5c-44c0-8225-d421b04c4415';
const userEmail = 'contact.polaris.ia@gmail.com';

async function setupUserAndProperties() {
  console.log('Configuration utilisateur et propriétés...');
  
  try {
    // 1. Vérifier/créer l'utilisateur dans la table publique users
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();
    
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // Utilisateur non trouvé, le créer
      console.log('Création de l\'utilisateur dans la table publique...');
      
      const { error: userCreateError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          firstName: 'Contact',
          lastName: 'Polaris IA',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      
      if (userCreateError) throw userCreateError;
      console.log('Utilisateur créé avec succès');
    } else if (existingUser) {
      console.log(`Utilisateur existant trouvé: ${existingUser.email}`);
    } else {
      throw userCheckError;
    }
    
    // 2. Vérifier/créer une propriété pour l'utilisateur
    const { data: existingProperty, error: propertyCheckError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('host_id', userId)
      .single();
    
    let propertyId;
    
    if (propertyCheckError && propertyCheckError.code === 'PGRST116') {
      // Aucune propriété trouvée, en créer une
      console.log('Création d\'une propriété par défaut...');
      
      const { data: newProperty, error: createPropertyError } = await supabase
        .from('properties')
        .insert({
          name: 'Appartement Airhost Demo',
          host_id: userId,
          address: 'Paris, France',
          description: 'Propriété de démonstration pour le système Airhost',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createPropertyError) throw createPropertyError;
      
      propertyId = newProperty.id;
      console.log(`Propriété créée: ${newProperty.name} (${propertyId})`);
    } else if (existingProperty) {
      propertyId = existingProperty.id;
      console.log(`Propriété existante: ${existingProperty.name} (${propertyId})`);
    } else {
      throw propertyCheckError;
    }
    
    // 3. Lier toutes les conversations sans property_id à cette propriété
    const { data: orphanConversations, error: orphanError } = await supabase
      .from('conversations')
      .select('id, guest_name')
      .is('property_id', null);
    
    if (orphanError) throw orphanError;
    
    console.log(`Conversations à lier: ${orphanConversations?.length || 0}`);
    
    if (orphanConversations && orphanConversations.length > 0) {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ property_id: propertyId })
        .is('property_id', null);
      
      if (updateError) throw updateError;
      
      console.log(`${orphanConversations.length} conversations liées à la propriété`);
    }
    
    // 4. Vérifier le filtrage par propriété
    console.log('\nTest du filtrage par propriété...');
    
    const { data: userConversations, error: filterError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        last_message,
        property_id,
        property:properties!inner(name, host_id)
      `)
      .eq('property.host_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(5);
    
    if (filterError) throw filterError;
    
    console.log(`Conversations visibles pour l'utilisateur: ${userConversations?.length || 0}`);
    
    userConversations?.forEach(conv => {
      console.log(`  - ${conv.guest_name}: ${conv.last_message?.substring(0, 50)}...`);
    });
    
    // 5. Tester la récupération complète comme le fait l'interface
    const { data: frontendData, error: frontendError } = await supabase
      .from('conversations')
      .select('*')
      .eq('property_id', propertyId)
      .order('last_message_at', { ascending: false });
    
    if (frontendError) throw frontendError;
    
    console.log(`\nDonnées pour l'interface: ${frontendData?.length || 0} conversations`);
    
    console.log('\n✅ Configuration complète terminée !');
    console.log(`   Utilisateur: ${userEmail}`);
    console.log(`   Propriété: ${propertyId}`);
    console.log(`   Conversations liées: ${frontendData?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  }
}

setupUserAndProperties();