/**
 * Solution simple pour le système de propriétés
 * Crée une propriété avec l'ID utilisateur et lie les conversations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PROD_SUPABASE_URL;
const serviceKey = process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

// ID de l'utilisateur connecté (récupéré des logs de session)
const userId = 'ff1818e7-9a5c-44c0-8225-d421b04c4415';

async function fixPropertySystem() {
  console.log('Configuration du système de propriétés...');
  
  try {
    // 1. Vérifier les propriétés existantes
    const { data: existingProps, error: checkError } = await supabase
      .from('properties')
      .select('id, name, host_id')
      .eq('host_id', userId);
    
    let propertyId;
    
    if (checkError) {
      console.log('Erreur vérification:', checkError.message);
      // Si erreur de contrainte, créer d'abord la propriété sans host_id
      const { data: newProp, error: createError } = await supabase
        .from('properties')
        .insert({
          name: 'Propriété Airhost',
          address: 'Paris, France',
          description: 'Propriété principale pour test'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      propertyId = newProp.id;
      console.log(`Propriété créée sans host_id: ${propertyId}`);
      
      // Puis mettre à jour avec host_id
      const { error: updateError } = await supabase
        .from('properties')
        .update({ host_id: userId })
        .eq('id', propertyId);
      
      if (updateError) {
        console.log('Maintien de la propriété sans host_id pour éviter les contraintes');
      } else {
        console.log('Host_id ajouté avec succès');
      }
    } else if (existingProps && existingProps.length > 0) {
      propertyId = existingProps[0].id;
      console.log(`Propriété existante trouvée: ${propertyId}`);
    } else {
      // Créer une nouvelle propriété
      const { data: newProp, error: createError } = await supabase
        .from('properties')
        .insert({
          name: 'Propriété Airhost Demo',
          address: 'Paris, France',
          description: 'Propriété principale'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      propertyId = newProp.id;
      console.log(`Nouvelle propriété créée: ${propertyId}`);
    }
    
    // 2. Lier toutes les conversations à cette propriété
    const { data: orphanConvs, error: orphanError } = await supabase
      .from('conversations')
      .select('id, guest_name')
      .is('property_id', null);
    
    if (orphanError) throw orphanError;
    
    console.log(`Conversations à lier: ${orphanConvs?.length || 0}`);
    
    if (orphanConvs && orphanConvs.length > 0) {
      const { error: linkError } = await supabase
        .from('conversations')
        .update({ property_id: propertyId })
        .is('property_id', null);
      
      if (linkError) throw linkError;
      console.log(`${orphanConvs.length} conversations liées à la propriété`);
    }
    
    // 3. Tester l'affichage des conversations
    const { data: linkedConvs, error: testError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .eq('property_id', propertyId)
      .limit(5);
    
    if (testError) throw testError;
    
    console.log(`\nConversations liées à la propriété: ${linkedConvs?.length || 0}`);
    linkedConvs?.forEach(conv => 
      console.log(`  - ${conv.guest_name} (${conv.id})`)
    );
    
    console.log('\n✅ Système de propriétés configuré !');
    console.log(`Propriété ID: ${propertyId}`);
    console.log(`Utilisateur ID: ${userId}`);
    
    return { propertyId, userId };
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

fixPropertySystem();