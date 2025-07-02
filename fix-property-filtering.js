/**
 * Script pour corriger le filtrage par propriété
 * Assure que chaque conversation est liée à une propriété du bon host
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PROD_SUPABASE_URL;
const serviceKey = process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function fixPropertyFiltering() {
  console.log('🔍 Vérification du filtrage par propriété...');
  
  try {
    // 1. Obtenir l'utilisateur via l'API auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'contact.polaris.ia@gmail.com',
      password: 'Airhost123;'
    });
    
    if (authError) throw authError;
    
    const userId = authData.user.id;
    console.log(`✅ Utilisateur trouvé: ${authData.user.email} (${userId})`);
    
    // 2. Vérifier les propriétés de l'utilisateur
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, host_id')
      .eq('host_id', userId);
    
    if (propertiesError) throw propertiesError;
    
    console.log(`📍 Propriétés trouvées: ${properties?.length || 0}`);
    
    if (!properties || properties.length === 0) {
      console.log('🏗️ Création d\'une propriété de test...');
      
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          name: 'Appartement Centre-Ville',
          host_id: userId,
          address: 'Paris, France',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      console.log(`✅ Propriété créée: ${newProperty.name} (${newProperty.id})`);
      properties.push(newProperty);
    }
    
    const defaultPropertyId = properties[0].id;
    
    // 3. Vérifier et corriger les conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .is('property_id', null);
    
    if (conversationsError) throw conversationsError;
    
    console.log(`🔄 Conversations sans propriété: ${conversations?.length || 0}`);
    
    if (conversations && conversations.length > 0) {
      console.log('📝 Mise à jour des conversations...');
      
      for (const conversation of conversations) {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ property_id: defaultPropertyId })
          .eq('id', conversation.id);
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour conversation ${conversation.id}:`, updateError);
        } else {
          console.log(`✅ Conversation ${conversation.guest_name} liée à la propriété`);
        }
      }
    }
    
    // 4. Test du filtrage
    console.log('\n🧪 Test du filtrage par propriété...');
    
    const { data: filteredConversations, error: filterError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        property:properties!inner(name, host_id, id)
      `)
      .eq('property.host_id', userId);
    
    if (filterError) throw filterError;
    
    console.log(`✅ Conversations filtrées pour l'utilisateur: ${filteredConversations?.length || 0}`);
    
    filteredConversations?.forEach(conv => {
      console.log(`  - ${conv.guest_name} → ${conv.property.name}`);
    });
    
    console.log('\n🎉 Filtrage par propriété vérifié et corrigé!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécution
fixPropertyFiltering();