/**
 * Force la liaison des conversations aux propriétés existantes
 * Résout le problème de property_id: null dans l'interface
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PROD_SUPABASE_URL;
const serviceKey = process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function forceLinkConversations() {
  console.log('🔗 Liaison forcée des conversations aux propriétés...');
  
  try {
    // 1. Récupérer la première propriété disponible
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, host_id')
      .limit(1)
      .single();
    
    if (propError) throw propError;
    
    const propertyId = properties.id;
    console.log(`📍 Propriété cible: ${properties.name} (${propertyId})`);
    
    // 2. Compter toutes les conversations
    const { count: totalCount, error: countError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    console.log(`📊 Total conversations dans la base: ${totalCount}`);
    
    // 3. Compter les conversations sans property_id
    const { count: nullCount, error: nullCountError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .is('property_id', null);
    
    if (nullCountError) throw nullCountError;
    console.log(`❌ Conversations sans property_id: ${nullCount}`);
    
    // 4. Lier spécifiquement les conversations avec property_id null
    console.log('🔄 Mise à jour des conversations avec property_id null...');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('conversations')
      .update({ property_id: propertyId })
      .is('property_id', null)
      .select('id, guest_name');
    
    if (updateError) throw updateError;
    
    console.log(`✅ ${updateResult?.length || 0} conversations liées à la propriété`);
    
    // 5. Vérification finale
    const { count: linkedCount, error: linkedCountError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);
    
    if (linkedCountError) throw linkedCountError;
    
    console.log(`🎯 Conversations liées à la propriété: ${linkedCount}`);
    
    // 6. Test de la requête interface
    const { data: interfaceTest, error: interfaceError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        guest_phone,
        property_id,
        check_in_date,
        check_out_date,
        status,
        last_message,
        last_message_at,
        unread_count
      `)
      .order('last_message_at', { ascending: false })
      .limit(3);
    
    if (interfaceError) throw interfaceError;
    
    console.log('\n🖥️ Test requête interface:');
    interfaceTest?.forEach(conv => 
      console.log(`  - ${conv.guest_name}: property_id = ${conv.property_id}`)
    );
    
    console.log('\n🎉 Liaison forcée terminée - l\'interface devrait maintenant afficher property_id !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

forceLinkConversations();