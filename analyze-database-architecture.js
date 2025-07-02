/**
 * Analyse complète de l'architecture de la base de données Airhost
 * Pour comprendre la relation entre utilisateurs, hôtes et propriétés
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function analyzeDatabaseArchitecture() {
  console.log('🔍 Analyse de l\'architecture de la base de données Airhost...\n');
  
  try {
    // 1. Analyser la table users (utilisateurs Supabase Auth)
    console.log('👥 ANALYSE DES UTILISATEURS (auth.users):');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('⚠️ Impossible d\'accéder à auth.users:', authError.message);
    } else {
      console.log(`   • ${authUsers.users?.length || 0} utilisateur(s) dans auth.users`);
      authUsers.users?.forEach(user => 
        console.log(`     - ${user.email} (${user.id})`)
      );
    }
    
    // 2. Analyser la table public.users (si elle existe)
    console.log('\n👤 ANALYSE DES UTILISATEURS (public.users):');
    const { data: publicUsers, error: publicUsersError } = await supabase
      .from('users')
      .select('*');
    
    if (publicUsersError) {
      console.log('   • Table public.users n\'existe pas ou erreur:', publicUsersError.message);
    } else {
      console.log(`   • ${publicUsers?.length || 0} utilisateur(s) dans public.users`);
      publicUsers?.forEach(user => 
        console.log(`     - ${user.email || user.name || user.id}`)
      );
    }
    
    // 3. Analyser la table hosts (si elle existe)
    console.log('\n🏠 ANALYSE DES HÔTES (hosts):');
    const { data: hosts, error: hostsError } = await supabase
      .from('hosts')
      .select('*');
    
    if (hostsError) {
      console.log('   • Table hosts n\'existe pas ou erreur:', hostsError.message);
    } else {
      console.log(`   • ${hosts?.length || 0} hôte(s) dans la table hosts`);
      hosts?.forEach(host => 
        console.log(`     - ${host.name || host.email || host.id}`)
      );
    }
    
    // 4. Analyser la table properties
    console.log('\n🏘️ ANALYSE DES PROPRIÉTÉS (properties):');
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*');
    
    if (propertiesError) {
      console.log('   • Erreur:', propertiesError.message);
    } else {
      console.log(`   • ${properties?.length || 0} propriété(s) dans la base`);
      properties?.forEach(property => 
        console.log(`     - ${property.name} (${property.id}) → host_id: ${property.host_id}`)
      );
    }
    
    // 5. Analyser les conversations
    console.log('\n💬 ANALYSE DES CONVERSATIONS:');
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .limit(10);
    
    if (conversationsError) {
      console.log('   • Erreur:', conversationsError.message);
    } else {
      console.log(`   • ${conversations?.length || 0} conversation(s) (sur les 10 premières)`);
      
      const withProperty = conversations?.filter(c => c.property_id) || [];
      const withoutProperty = conversations?.filter(c => !c.property_id) || [];
      
      console.log(`     - Avec property_id: ${withProperty.length}`);
      console.log(`     - Sans property_id: ${withoutProperty.length}`);
    }
    
    // 6. Vérifier la relation catheline
    console.log('\n🎯 VÉRIFICATION DE CATHELINE:');
    const cathelinesEmail = 'catheline@agences-placid.com';
    const cathelinesHostId = '4d3e2258-791f-471d-9320-666afbab2e29';
    const cathelinesPropertyId = '5097557f-1ba3-4474-8a94-b111d73cfcba';
    
    // Vérifier si la propriété existe avec le bon host_id
    const { data: cathelinesProperty, error: cathelinesPropertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', cathelinesPropertyId)
      .single();
    
    if (cathelinesPropertyError) {
      console.log(`   • ❌ Propriété ${cathelinesPropertyId} introuvable`);
    } else {
      console.log(`   • ✅ Propriété trouvée: ${cathelinesProperty.name}`);
      console.log(`     - host_id dans la propriété: ${cathelinesProperty.host_id}`);
      console.log(`     - host_id attendu: ${cathelinesHostId}`);
      console.log(`     - Correspond: ${cathelinesProperty.host_id === cathelinesHostId ? 'OUI' : 'NON'}`);
    }
    
    // Vérifier les conversations liées à cette propriété
    const { data: cathelinesConversations, error: cathelinesConversationsError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .eq('property_id', cathelinesPropertyId);
    
    if (cathelinesConversationsError) {
      console.log(`   • ❌ Erreur conversations: ${cathelinesConversationsError.message}`);
    } else {
      console.log(`   • Conversations de cette propriété: ${cathelinesConversations?.length || 0}`);
      cathelinesConversations?.forEach(conv => 
        console.log(`     - ${conv.guest_name} (${conv.id})`)
      );
    }
    
    // 7. Recommandations d'architecture
    console.log('\n📋 RECOMMANDATIONS D\'ARCHITECTURE:');
    
    const hasPublicUsers = !publicUsersError && publicUsers && publicUsers.length > 0;
    const hasHosts = !hostsError && hosts && hosts.length > 0;
    const hasProperties = !propertiesError && properties && properties.length > 0;
    
    if (hasPublicUsers && hasHosts) {
      console.log('   • ⚠️ Redondance: Tables users ET hosts détectées');
      console.log('   • 💡 Recommandation: Utiliser soit auth.users + properties, soit une table hosts unifiée');
    }
    
    if (!hasProperties) {
      console.log('   • ❌ Table properties manquante - essentielle pour le filtrage');
    }
    
    console.log('\n🏗️ ARCHITECTURE RECOMMANDÉE:');
    console.log('   1. auth.users (Supabase Auth) - authentification');
    console.log('   2. properties (host_id référence auth.users.id) - propriétés');
    console.log('   3. conversations (property_id référence properties.id) - conversations');
    console.log('   4. Supprimer tables redondantes: hosts, public.users si non utilisées');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

analyzeDatabaseArchitecture();