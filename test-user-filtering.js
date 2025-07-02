/**
 * Test du filtrage par utilisateur pour catheline@agences-placid.com
 * Host ID: 4d3e2258-791f-471d-9320-666afbab2e29
 * Property ID: 5097557f-1ba3-4474-8a94-b111d73cfcba
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testUserFiltering() {
  console.log('🔍 Test du filtrage par utilisateur...');
  
  try {
    const currentHostId = '4d3e2258-791f-471d-9320-666afbab2e29';
    
    // 1. Vérifier les propriétés de l'utilisateur
    const { data: userProperties, error: propError } = await supabase
      .from('properties')
      .select('id, name, host_id')
      .eq('host_id', currentHostId);
    
    if (propError) throw propError;
    
    console.log(`📋 Propriétés de l'utilisateur ${currentHostId}:`);
    userProperties?.forEach(prop => 
      console.log(`  - ${prop.name} (${prop.id})`)
    );
    
    // 2. Test de la requête avec jointure (comme dans l'interface)
    const { data: filteredConversations, error: filterError } = await supabase
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
        unread_count,
        property:properties!inner(id, name, host_id)
      `)
      .eq('property.host_id', currentHostId)
      .order('last_message_at', { ascending: false });
    
    if (filterError) throw filterError;
    
    console.log(`\n💬 Conversations filtrées pour l'utilisateur: ${filteredConversations?.length || 0}`);
    filteredConversations?.forEach(conv => 
      console.log(`  - ${conv.guest_name} → ${conv.property?.name} (${conv.property_id})`)
    );
    
    // 3. Comparer avec toutes les conversations
    const { data: allConversations, error: allError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .order('last_message_at', { ascending: false });
    
    if (allError) throw allError;
    
    console.log(`\n📊 Résumé du filtrage:`);
    console.log(`   • Total conversations: ${allConversations?.length || 0}`);
    console.log(`   • Conversations visibles par l'utilisateur: ${filteredConversations?.length || 0}`);
    console.log(`   • Filtrage effectif: ${filteredConversations?.length < allConversations?.length ? 'OUI' : 'NON'}`);
    
    // 4. Vérifier les conversations avec property_id null
    const { count: nullPropertyCount, error: nullError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .is('property_id', null);
    
    if (nullError) throw nullError;
    
    console.log(`   • Conversations sans property_id: ${nullPropertyCount}`);
    
    if (filteredConversations?.length === 0 && nullPropertyCount > 0) {
      console.log('\n⚠️ PROBLÈME: Le filtrage ne fonctionne pas car il y a des conversations sans property_id');
      console.log('   Solution: Lier les conversations orphelines aux propriétés de l\'utilisateur');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testUserFiltering();