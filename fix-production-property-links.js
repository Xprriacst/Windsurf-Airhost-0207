/**
 * Correction finale des liens property_id en production
 * Lie toutes les conversations aux propriétés existantes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function fixProductionPropertyLinks() {
  console.log('🔧 Correction des liens property_id en production...');
  
  try {
    // 1. Récupérer toutes les propriétés disponibles
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, host_id');
    
    if (propError) throw propError;
    
    console.log(`📊 Propriétés disponibles: ${properties?.length || 0}`);
    properties?.forEach(prop => 
      console.log(`  - ${prop.name} (${prop.id})`)
    );
    
    if (!properties || properties.length === 0) {
      console.log('❌ Aucune propriété trouvée. Création d\'une propriété par défaut...');
      
      // Créer une propriété par défaut
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          name: 'Loft Moderne Montmartre',
          host_id: 'dd54cd4b-4e83-4e1a-a2d8-3df8e7a1d2b9',
          address: 'Paris, France'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      console.log(`✅ Propriété créée: ${newProperty.name} (${newProperty.id})`);
      properties.push(newProperty);
    }
    
    // 2. Sélectionner la première propriété comme propriété par défaut
    const defaultProperty = properties[0];
    console.log(`🎯 Propriété par défaut: ${defaultProperty.name} (${defaultProperty.id})`);
    
    // 3. Compter les conversations sans property_id
    const { count: orphanCount, error: countError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .is('property_id', null);
    
    if (countError) throw countError;
    
    console.log(`❌ Conversations sans property_id: ${orphanCount}`);
    
    // 4. Lier toutes les conversations orphelines à la propriété par défaut
    if (orphanCount > 0) {
      const { data: updateResult, error: updateError } = await supabase
        .from('conversations')
        .update({ property_id: defaultProperty.id })
        .is('property_id', null)
        .select('id, guest_name');
      
      if (updateError) throw updateError;
      
      console.log(`✅ ${updateResult?.length || 0} conversations liées à ${defaultProperty.name}`);
    }
    
    // 5. Vérification finale
    const { count: finalOrphanCount, error: finalCountError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .is('property_id', null);
    
    if (finalCountError) throw finalCountError;
    
    console.log(`📋 Conversations orphelines restantes: ${finalOrphanCount}`);
    
    // 6. Test de la requête interface
    const { data: interfaceTest, error: interfaceError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id
      `)
      .order('last_message_at', { ascending: false })
      .limit(5);
    
    if (interfaceError) throw interfaceError;
    
    console.log('\n🖥️ Test requête interface (5 premières):');
    interfaceTest?.forEach(conv => 
      console.log(`  - ${conv.guest_name}: property_id = ${conv.property_id}`)
    );
    
    console.log('\n🎉 Correction terminée - toutes les conversations sont maintenant liées !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

fixProductionPropertyLinks();