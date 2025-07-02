/**
 * Correction du système de propriétés pour catheline@agences-placid.com
 * Crée sa propriété et lie les conversations appropriées
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function fixUserPropertySystem() {
  console.log('🔧 Correction du système de propriétés pour catheline@agences-placid.com...');
  
  try {
    const currentHostId = '4d3e2258-791f-471d-9320-666afbab2e29';
    const expectedPropertyId = '5097557f-1ba3-4474-8a94-b111d73cfcba';
    
    // 1. Vérifier si la propriété existe
    const { data: existingProperty, error: propCheckError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', expectedPropertyId)
      .single();
    
    if (propCheckError && propCheckError.code !== 'PGRST116') {
      throw propCheckError;
    }
    
    if (!existingProperty) {
      console.log('🏠 Création de la propriété pour catheline...');
      
      // Créer la propriété avec l'ID attendu
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          id: expectedPropertyId,
          name: 'Loft Moderne Montmartre',
          host_id: currentHostId,
          address: 'Montmartre, Paris, France'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      console.log(`✅ Propriété créée: ${newProperty.name} (${newProperty.id})`);
    } else {
      console.log(`✅ Propriété existante: ${existingProperty.name} (${existingProperty.id})`);
      
      // Mettre à jour le host_id si nécessaire
      if (existingProperty.host_id !== currentHostId) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({ host_id: currentHostId })
          .eq('id', expectedPropertyId);
        
        if (updateError) throw updateError;
        console.log(`🔄 Host ID mis à jour pour la propriété`);
      }
    }
    
    // 2. Identifier les conversations à lier à catheline
    // Généralement les conversations de "Véro Ruelle" et "ingrid devetzis"
    const conversationsToLink = [
      '44cf0b75-f2e0-450c-9e2d-ac8bc43d4dcb', // Véro Ruelle
      'e206ba1a-621d-4b54-8322-d832d727627d'  // ingrid devetzis
    ];
    
    console.log('🔗 Liaison des conversations à la propriété...');
    
    for (const convId of conversationsToLink) {
      const { error: linkError } = await supabase
        .from('conversations')
        .update({ property_id: expectedPropertyId })
        .eq('id', convId);
      
      if (linkError) {
        console.log(`⚠️ Erreur liaison conversation ${convId}:`, linkError.message);
      } else {
        console.log(`✅ Conversation ${convId} liée à la propriété`);
      }
    }
    
    // 3. Vérifier les résultats
    const { data: linkedConversations, error: verifyError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties!inner(id, name, host_id)
      `)
      .eq('property.host_id', currentHostId);
    
    if (verifyError) throw verifyError;
    
    console.log(`\n📋 Conversations liées à catheline (${currentHostId}):`);
    linkedConversations?.forEach(conv => 
      console.log(`  - ${conv.guest_name} → ${conv.property?.name}`)
    );
    
    console.log(`\n🎉 Système de propriétés configuré - ${linkedConversations?.length || 0} conversation(s) visible(s)`);
    
    // 4. Test final du filtrage
    const { data: testFilteredConversations, error: testError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties!inner(id, name, host_id)
      `)
      .eq('property.host_id', currentHostId)
      .order('last_message_at', { ascending: false });
    
    if (testError) throw testError;
    
    console.log(`✅ Test final: ${testFilteredConversations?.length || 0} conversation(s) dans l'interface`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

fixUserPropertySystem();