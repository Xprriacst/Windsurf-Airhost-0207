/**
 * Configuration finale de catheline avec son vrai ID utilisateur
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function fixCathelineSetup() {
  console.log('🔧 Configuration finale de catheline@agences-placid.com...');
  
  try {
    const cathelinesEmail = 'catheline@agences-placid.com';
    const expectedPropertyId = '5097557f-1ba3-4474-8a94-b111d73cfcba';
    
    // 1. Récupérer l'ID réel de catheline
    console.log('🔍 Recherche de l\'utilisateur catheline...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) throw usersError;
    
    const cathelineUser = users.users.find(user => user.email === cathelinesEmail);
    
    if (!cathelineUser) {
      throw new Error(`Utilisateur ${cathelinesEmail} introuvable`);
    }
    
    const realHostId = cathelineUser.id;
    console.log(`✅ Utilisateur trouvé: ${cathelineUser.email} (${realHostId})`);
    
    // 2. Créer ou mettre à jour la propriété
    console.log('\n🏠 Configuration de la propriété...');
    
    const { data: existingProperty, error: checkError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', expectedPropertyId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (!existingProperty) {
      // Créer la propriété
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          id: expectedPropertyId,
          name: 'Loft Moderne Montmartre',
          host_id: realHostId,
          address: 'Montmartre, Paris, France'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      console.log(`✅ Propriété créée: ${newProperty.name}`);
    } else {
      // Mettre à jour le host_id
      const { error: updateError } = await supabase
        .from('properties')
        .update({ host_id: realHostId })
        .eq('id', expectedPropertyId);
      
      if (updateError) throw updateError;
      console.log(`🔄 Propriété mise à jour avec host_id: ${realHostId}`);
    }
    
    // 3. Lier quelques conversations existantes à la propriété
    console.log('\n💬 Liaison des conversations...');
    
    const { data: orphanConversations, error: orphanError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .is('property_id', null)
      .limit(3);
    
    if (orphanError) throw orphanError;
    
    console.log(`📋 ${orphanConversations?.length || 0} conversations orphelines trouvées`);
    
    for (const conv of orphanConversations || []) {
      const { error: linkError } = await supabase
        .from('conversations')
        .update({ property_id: expectedPropertyId })
        .eq('id', conv.id);
      
      if (linkError) {
        console.log(`⚠️ Erreur liaison ${conv.guest_name}:`, linkError.message);
      } else {
        console.log(`✅ ${conv.guest_name} liée à la propriété`);
      }
    }
    
    // 4. Mettre à jour le filtrage dans le code pour utiliser le bon host_id
    console.log('\n🔧 Mise à jour de la configuration...');
    
    console.log(`   • Email: ${cathelinesEmail}`);
    console.log(`   • Host ID réel: ${realHostId}`);
    console.log(`   • Propriété ID: ${expectedPropertyId}`);
    console.log(`   • ⚠️ Il faut mettre à jour le hard-codé dans Chat.tsx`);
    
    // 5. Test final du filtrage
    console.log('\n🎯 Test du filtrage...');
    
    const { data: filteredConversations, error: filterError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties!inner(id, name, host_id)
      `)
      .eq('property.host_id', realHostId);
    
    if (filterError) throw filterError;
    
    console.log(`🎉 Test réussi: ${filteredConversations?.length || 0} conversation(s) filtrées`);
    
    filteredConversations?.forEach(conv => 
      console.log(`   - ${conv.guest_name}`)
    );
    
    console.log(`\n📝 NEXT STEPS:`);
    console.log(`   1. Mettre à jour Chat.tsx avec host_id: ${realHostId}`);
    console.log(`   2. Redémarrer l'application`);
    console.log(`   3. Tester l'interface avec les conversations filtrées`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

fixCathelineSetup();