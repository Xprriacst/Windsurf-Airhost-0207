/**
 * Setup du système de propriétés pour le filtrage par utilisateur
 * Crée une propriété par défaut et lie les conversations existantes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PROD_SUPABASE_URL;
const serviceKey = process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

// ID utilisateur récupéré des logs de connexion
const userId = 'ff1818e7-9a5c-44c0-8225-d421b04c4415';

async function setupPropertySystem() {
  console.log('Configuration du système de propriétés...');
  
  try {
    // 1. Créer une propriété pour l'utilisateur
    const { data: existingProperty, error: checkError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('host_id', userId)
      .limit(1)
      .single();
    
    let propertyId;
    
    if (checkError && checkError.code === 'PGRST116') {
      // Aucune propriété trouvée, en créer une
      console.log('Création d\'une propriété par défaut...');
      
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          name: 'Appartement Airhost',
          host_id: userId,
          address: 'Paris, France',
          description: 'Propriété principale pour les tests Airhost'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      propertyId = newProperty.id;
      console.log(`Propriété créée: ${newProperty.name} (${propertyId})`);
    } else if (existingProperty) {
      propertyId = existingProperty.id;
      console.log(`Propriété existante trouvée: ${existingProperty.name} (${propertyId})`);
    } else {
      throw checkError;
    }
    
    // 2. Mettre à jour les conversations sans property_id
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .is('property_id', null);
    
    if (convError) throw convError;
    
    console.log(`Conversations à lier: ${conversations?.length || 0}`);
    
    if (conversations && conversations.length > 0) {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ property_id: propertyId })
        .is('property_id', null);
      
      if (updateError) throw updateError;
      
      console.log(`${conversations.length} conversations liées à la propriété`);
    }
    
    // 3. Tester le filtrage
    const { data: filteredConversations, error: filterError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties!inner(name, host_id)
      `)
      .eq('property.host_id', userId);
    
    if (filterError) throw filterError;
    
    console.log('\nRésultat du filtrage par propriété:');
    console.log(`Conversations visibles pour l'utilisateur: ${filteredConversations?.length || 0}`);
    
    filteredConversations?.forEach(conv => {
      console.log(`  - ${conv.guest_name} → ${conv.property?.name}`);
    });
    
    console.log('\nSystème de propriétés configuré avec succès !');
    
  } catch (error) {
    console.error('Erreur:', error.message);
    throw error;
  }
}

setupPropertySystem();