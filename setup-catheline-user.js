/**
 * Configuration de l'utilisateur catheline@agences-placid.com
 * Création de sa propriété et liaison des conversations appropriées
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function setupCathelineUser() {
  console.log('👤 Configuration de l\'utilisateur catheline@agences-placid.com...');
  
  try {
    const cathelinesEmail = 'catheline@agences-placid.com';
    let cathelinesHostId = '4d3e2258-791f-471d-9320-666afbab2e29';
    const cathelinesPropertyId = '5097557f-1ba3-4474-8a94-b111d73cfcba';
    
    // 1. Créer l'utilisateur catheline dans auth.users
    console.log('🔐 Création de l\'utilisateur dans auth.users...');
    
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: cathelinesEmail,
      password: 'TempPassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'Catheline Agences Placid'
      }
    });
    
    if (userError && !userError.message.includes('User already registered')) {
      throw userError;
    }
    
    if (newUser.user) {
      console.log(`✅ Utilisateur créé: ${newUser.user.email} (${newUser.user.id})`);
      
      // Mettre à jour l'ID si différent
      if (newUser.user.id !== cathelinesHostId) {
        console.log(`⚠️ L'ID généré (${newUser.user.id}) diffère de l'ID attendu (${cathelinesHostId})`);
        console.log('💡 Utilisation de l\'ID généré pour la suite...');
        cathelinesHostId = newUser.user.id;
      }
    } else {
      console.log('✅ Utilisateur déjà existant');
    }
    
    // 2. Créer la propriété de catheline
    console.log('\n🏠 Création de la propriété...');
    
    const { data: existingProperty, error: checkError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', cathelinesPropertyId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (!existingProperty) {
      const { data: newProperty, error: propertyError } = await supabase
        .from('properties')
        .insert({
          id: cathelinesPropertyId,
          name: 'Loft Moderne Montmartre',
          host_id: cathelinesHostId,
          address: 'Montmartre, Paris, France'
        })
        .select()
        .single();
      
      if (propertyError) throw propertyError;
      
      console.log(`✅ Propriété créée: ${newProperty.name} (${newProperty.id})`);
    } else {
      // Mettre à jour le host_id si nécessaire
      if (existingProperty.host_id !== cathelinesHostId) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({ host_id: cathelinesHostId })
          .eq('id', cathelinesPropertyId);
        
        if (updateError) throw updateError;
        console.log(`🔄 Propriété mise à jour avec le bon host_id`);
      } else {
        console.log(`✅ Propriété déjà existante: ${existingProperty.name}`);
      }
    }
    
    // 3. Identifier et lier les conversations de catheline
    console.log('\n💬 Liaison des conversations...');
    
    // Rechercher les conversations qui devraient appartenir à catheline
    // Basé sur les noms des invités ou autres critères
    const { data: conversationsToLink, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .in('guest_name', ['Véro Ruelle', 'ingrid devetzis']);
    
    if (conversationsError) throw conversationsError;
    
    console.log(`📋 Conversations à lier: ${conversationsToLink?.length || 0}`);
    
    for (const conversation of conversationsToLink || []) {
      if (conversation.property_id !== cathelinesPropertyId) {
        const { error: linkError } = await supabase
          .from('conversations')
          .update({ property_id: cathelinesPropertyId })
          .eq('id', conversation.id);
        
        if (linkError) {
          console.log(`⚠️ Erreur liaison ${conversation.guest_name}:`, linkError.message);
        } else {
          console.log(`✅ ${conversation.guest_name} liée à la propriété`);
        }
      }
    }
    
    // 4. Vérification finale
    console.log('\n🔍 Vérification finale...');
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property_id,
        property:properties!inner(id, name, host_id)
      `)
      .eq('property.host_id', cathelinesHostId);
    
    if (finalError) throw finalError;
    
    console.log(`🎉 Configuration terminée !`);
    console.log(`   • Utilisateur: ${cathelinesEmail} (${cathelinesHostId})`);
    console.log(`   • Propriété: Loft Moderne Montmartre (${cathelinesPropertyId})`);
    console.log(`   • Conversations visibles: ${finalCheck?.length || 0}`);
    
    finalCheck?.forEach(conv => 
      console.log(`     - ${conv.guest_name}`)
    );
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

setupCathelineUser();