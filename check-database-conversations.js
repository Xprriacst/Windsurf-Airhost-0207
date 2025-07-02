/**
 * Vérification rapide des conversations dans la base de production
 * Pour comprendre quelles conversations devraient être visibles par catheline
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkDatabaseConversations() {
  console.log('🔍 Vérification des conversations dans la base de production...');
  
  try {
    const currentHostId = '4d3e2258-791f-471d-9320-666afbab2e29';
    const expectedPropertyId = '5097557f-1ba3-4474-8a94-b111d73cfcba';
    
    // 1. Vérifier toutes les conversations avec leurs property_id
    const { data: allConversations, error: allError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .order('last_message_at', { ascending: false })
      .limit(10);
    
    if (allError) throw allError;
    
    console.log('📋 Conversations récentes dans la base:');
    allConversations?.forEach(conv => 
      console.log(`  - ${conv.guest_name}: property_id = ${conv.property_id || 'NULL'}`)
    );
    
    // 2. Identifier les conversations qui devraient appartenir à catheline
    const cathelinesConversations = allConversations?.filter(conv => 
      conv.property_id === expectedPropertyId
    );
    
    console.log(`\n🎯 Conversations qui devraient être visibles par catheline:`);
    cathelinesConversations?.forEach(conv => 
      console.log(`  - ${conv.guest_name} (${conv.id})`)
    );
    
    // 3. Vérifier la propriété de catheline
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', expectedPropertyId)
      .single();
    
    if (propError && propError.code !== 'PGRST116') {
      throw propError;
    }
    
    if (property) {
      console.log(`\n🏠 Propriété ${expectedPropertyId}:`);
      console.log(`  - Nom: ${property.name}`);
      console.log(`  - Host ID: ${property.host_id}`);
      console.log(`  - Correspond à catheline: ${property.host_id === currentHostId ? 'OUI' : 'NON'}`);
    } else {
      console.log(`\n❌ Propriété ${expectedPropertyId} introuvable`);
    }
    
    // 4. Test de la requête avec filtrage (comme dans l'interface)
    const { data: filteredConversations, error: filterError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties!inner(id, name, host_id)
      `)
      .eq('property.host_id', currentHostId)
      .order('last_message_at', { ascending: false });
    
    if (filterError) {
      console.log(`\n❌ Erreur dans la requête filtrée:`, filterError.message);
    } else {
      console.log(`\n✅ Requête filtrée réussie: ${filteredConversations?.length || 0} conversation(s)`);
      filteredConversations?.forEach(conv => 
        console.log(`  - ${conv.guest_name}`)
      );
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkDatabaseConversations();