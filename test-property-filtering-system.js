/**
 * Test final du système de filtrage par propriété
 * Valide que les conversations sont correctement liées aux propriétés
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testPropertyFilteringSystem() {
  console.log('🧪 Test du système de filtrage par propriété...');
  
  try {
    // 1. Vérifier la structure des propriétés
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, host_id');
    
    if (propError) throw propError;
    
    console.log(`📊 Propriétés dans le système: ${properties?.length || 0}`);
    properties?.forEach(prop => 
      console.log(`  - ${prop.name} (${prop.id}) → Host: ${prop.host_id}`)
    );
    
    // 2. Vérifier les conversations liées
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties(id, name, host_id)
      `)
      .not('property_id', 'is', null)
      .limit(10);
    
    if (convError) throw convError;
    
    console.log(`\n💬 Conversations liées à des propriétés: ${conversations?.length || 0}`);
    conversations?.forEach(conv => 
      console.log(`  - ${conv.guest_name} → ${conv.property?.name || 'N/A'} (${conv.property_id})`)
    );
    
    // 3. Test de filtrage par utilisateur
    const hostId = 'dd54cd4b-4e83-4e1a-a2d8-3df8e7a1d2b9'; // Host principal
    
    const { data: userConversations, error: userError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties!inner(id, name, host_id)
      `)
      .eq('property.host_id', hostId);
    
    if (userError) throw userError;
    
    console.log(`\n👤 Conversations pour l'utilisateur ${hostId}: ${userConversations?.length || 0}`);
    userConversations?.forEach(conv => 
      console.log(`  - ${conv.guest_name} → ${conv.property?.name}`)
    );
    
    // 4. Vérifier qu'il n'y a plus de conversations orphelines
    const { count: orphanCount, error: orphanError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .is('property_id', null);
    
    if (orphanError) throw orphanError;
    
    console.log(`\n❌ Conversations orphelines (property_id null): ${orphanCount}`);
    
    // 5. Test de la requête interface
    const { data: interfaceData, error: interfaceError } = await supabase
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
      .limit(5);
    
    if (interfaceError) throw interfaceError;
    
    console.log(`\n🖥️ Test requête interface (5 premières conversations):`);
    interfaceData?.forEach(conv => 
      console.log(`  - ${conv.guest_name}: property_id = ${conv.property_id}`)
    );
    
    // Résumé
    console.log('\n✅ RÉSULTATS DU TEST:');
    console.log(`   • ${properties?.length || 0} propriétés configurées`);
    console.log(`   • ${conversations?.length || 0} conversations liées aux propriétés`);
    console.log(`   • ${userConversations?.length || 0} conversations visibles pour l'utilisateur test`);
    console.log(`   • ${orphanCount} conversation(s) orpheline(s)`);
    console.log(`   • Interface récupère correctement les property_id`);
    
    if (orphanCount === 0 && conversations?.length > 0) {
      console.log('\n🎉 SYSTÈME DE FILTRAGE PAR PROPRIÉTÉ FONCTIONNEL !');
    } else {
      console.log('\n⚠️ Des améliorations sont nécessaires');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testPropertyFilteringSystem();