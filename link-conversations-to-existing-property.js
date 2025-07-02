/**
 * Lie les conversations orphelines à une propriété existante
 * pour permettre l'affichage dans l'interface
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PROD_SUPABASE_URL;
const serviceKey = process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function linkConversationsToExistingProperty() {
  console.log('Liaison des conversations à une propriété existante...');
  
  try {
    // 1. Récupérer la première propriété disponible
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, host_id')
      .limit(1)
      .single();
    
    if (propError) throw propError;
    
    const propertyId = properties.id;
    console.log(`Propriété sélectionnée: ${properties.name} (${propertyId})`);
    
    // 2. Récupérer toutes les conversations sans property_id
    const { data: orphanConversations, error: convError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .is('property_id', null);
    
    if (convError) throw convError;
    
    console.log(`Conversations sans propriété: ${orphanConversations?.length || 0}`);
    
    if (orphanConversations && orphanConversations.length > 0) {
      // 3. Lier toutes les conversations à cette propriété
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ property_id: propertyId })
        .is('property_id', null);
      
      if (updateError) throw updateError;
      
      console.log(`${orphanConversations.length} conversations liées à la propriété ${propertyId}`);
      
      // 4. Vérifier le résultat
      const { data: linkedConversations, error: verifyError } = await supabase
        .from('conversations')
        .select('id, guest_name, property_id')
        .eq('property_id', propertyId)
        .limit(5);
      
      if (verifyError) throw verifyError;
      
      console.log(`Conversations maintenant liées: ${linkedConversations?.length || 0}`);
      linkedConversations?.forEach(conv => 
        console.log(`  - ${conv.guest_name} (${conv.id})`)
      );
      
      // 5. Tester une requête comme le fait l'interface
      const { data: testQuery, error: testError } = await supabase
        .from('conversations')
        .select(`
          id,
          guest_name,
          guest_phone,
          property:properties!inner(name, host_id, id),
          check_in_date,
          check_out_date,
          status,
          last_message,
          last_message_at,
          unread_count
        `)
        .eq('property_id', propertyId)
        .order('last_message_at', { ascending: false })
        .limit(3);
      
      if (testError) throw testError;
      
      console.log(`\nTest de requête interface réussi: ${testQuery?.length || 0} conversations`);
      testQuery?.forEach(conv => 
        console.log(`  - ${conv.guest_name}: ${conv.last_message?.substring(0, 50)}...`)
      );
    }
    
    console.log('\n✅ Liaison terminée - les conversations devraient maintenant être visibles !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

linkConversationsToExistingProperty();