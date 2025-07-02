/**
 * Crée une propriété avec l'ID utilisateur et lie les conversations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PROD_SUPABASE_URL;
const serviceKey = process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

// ID utilisateur de la session active
const userId = 'ff1818e7-9a5c-44c0-8225-d421b04c4415';

async function createPropertyAndLink() {
  console.log('Création de la propriété et liaison des conversations...');
  
  try {
    // 1. Créer la propriété directement avec l'ID utilisateur
    const { data: newProperty, error: createError } = await supabase
      .from('properties')
      .insert({
        name: 'Appartement Airhost Production',
        host_id: userId,
        address: 'Paris, France',
        description: 'Propriété principale pour la production Airhost',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.log('Erreur création propriété:', createError.message);
      
      // Si contrainte, vérifier les propriétés existantes
      const { data: existingProps, error: checkError } = await supabase
        .from('properties')
        .select('id, name, host_id')
        .limit(5);
      
      if (checkError) throw checkError;
      
      console.log('Propriétés existantes:', existingProps);
      
      if (existingProps && existingProps.length > 0) {
        // Utiliser la première propriété et mettre à jour son host_id
        const propertyId = existingProps[0].id;
        
        const { error: updateError } = await supabase
          .from('properties')
          .update({ host_id: userId })
          .eq('id', propertyId);
        
        if (updateError) {
          console.log('Impossible de lier à l\'utilisateur, utilisation sans filtrage');
          // Lier les conversations à cette propriété quand même
          await linkConversationsToProperty(propertyId);
        } else {
          console.log(`Propriété ${propertyId} liée à l'utilisateur ${userId}`);
          await linkConversationsToProperty(propertyId);
        }
        
        return;
      }
    } else {
      console.log(`Propriété créée: ${newProperty.name} (${newProperty.id})`);
      await linkConversationsToProperty(newProperty.id);
      return;
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

async function linkConversationsToProperty(propertyId) {
  console.log(`Liaison des conversations à la propriété ${propertyId}...`);
  
  try {
    // Récupérer les conversations sans property_id
    const { data: orphanConversations, error: getError } = await supabase
      .from('conversations')
      .select('id, guest_name')
      .is('property_id', null);
    
    if (getError) throw getError;
    
    console.log(`Conversations à lier: ${orphanConversations?.length || 0}`);
    
    if (orphanConversations && orphanConversations.length > 0) {
      // Lier toutes les conversations à cette propriété
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ property_id: propertyId })
        .is('property_id', null);
      
      if (updateError) throw updateError;
      
      console.log(`${orphanConversations.length} conversations liées à la propriété`);
      
      // Vérifier le résultat
      const { data: linkedConversations, error: verifyError } = await supabase
        .from('conversations')
        .select('id, guest_name, property_id')
        .eq('property_id', propertyId)
        .limit(3);
      
      if (verifyError) throw verifyError;
      
      console.log('Conversations liées vérifiées:');
      linkedConversations?.forEach(conv => 
        console.log(`  - ${conv.guest_name} (${conv.id})`)
      );
    }
    
    console.log('✅ Liaison terminée !');
    
  } catch (error) {
    console.error('Erreur lors de la liaison:', error.message);
  }
}

createPropertyAndLink();