/**
 * Correction de la propriété de l'Opale pour qu'elle appartienne au bon utilisateur catheline
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function fixOpaleOwnership() {
  console.log('🔧 Correction de la propriété de l\'Opale...');
  
  try {
    const correctCathelineId = '4d3e2258-791f-471d-9320-666afbab2e29';
    const opaleId = '5097557f-1ba3-4474-8a94-b111d73cfcba';
    
    // 1. Vérifier l'état actuel
    console.log('🔍 État actuel de l\'Opale:');
    const { data: currentOpale, error: checkError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', opaleId)
      .single();
    
    if (checkError) throw checkError;
    
    console.log(`   Nom: ${currentOpale.name}`);
    console.log(`   Host ID actuel: ${currentOpale.host_id}`);
    console.log(`   Host ID attendu: ${correctCathelineId}`);
    console.log(`   Match: ${currentOpale.host_id === correctCathelineId ? 'OUI' : 'NON'}`);
    
    // 2. Corriger le host_id si nécessaire
    if (currentOpale.host_id !== correctCathelineId) {
      console.log('\n🔄 Mise à jour du host_id...');
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          host_id: correctCathelineId,
          name: 'LOpale' // S'assurer que le nom est correct
        })
        .eq('id', opaleId);
      
      if (updateError) throw updateError;
      
      console.log('✅ Host ID mis à jour avec succès');
    } else {
      console.log('✅ Host ID déjà correct');
    }
    
    // 3. Vérifier les conversations liées
    console.log('\n💬 Vérification des conversations:');
    const { data: opaleConversations, error: convError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .eq('property_id', opaleId);
    
    if (convError) throw convError;
    
    console.log(`   ${opaleConversations?.length || 0} conversation(s) liées à l'Opale:`);
    opaleConversations?.forEach(conv => 
      console.log(`     - ${conv.guest_name}`)
    );
    
    // 4. Test final du filtrage
    console.log('\n🎯 Test du filtrage final:');
    const { data: filteredConversations, error: filterError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties!inner(id, name, host_id)
      `)
      .eq('property.host_id', correctCathelineId)
      .order('last_message_at', { ascending: false });
    
    if (filterError) throw filterError;
    
    console.log(`🎉 Filtrage réussi: ${filteredConversations?.length || 0} conversation(s)`);
    filteredConversations?.forEach(conv => 
      console.log(`   - ${conv.guest_name} (propriété: ${conv.property.name})`)
    );
    
    console.log('\n✅ Configuration terminée !');
    console.log('📱 L\'interface devrait maintenant afficher les conversations de l\'Opale');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

fixOpaleOwnership();