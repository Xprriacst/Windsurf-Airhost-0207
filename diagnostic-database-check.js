// Script de diagnostic pour vérifier quelle base de données nous interrogeons
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('🔍 Configuration de la base de données:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Clé: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'Non définie'}`);

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// ID de l'hôte recherché
const HOST_ID = '471eca7b-7628-4ba1-a454-81dd60ae47bf';

async function diagnosticDatabase() {
  try {
    console.log('\n📊 DIAGNOSTIC DE LA BASE DE DONNÉES');
    console.log('=====================================');
    
    // 1. Lister toutes les conversations
    console.log('\n1. Toutes les conversations dans la base:');
    const { data: allConversations, error: allConvError } = await supabase
      .from('conversations')
      .select('id, guest_name, guest_phone, property_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allConvError) {
      console.error(`❌ Erreur: ${allConvError.message}`);
    } else if (allConversations && allConversations.length > 0) {
      console.log(`✓ ${allConversations.length} conversation(s) trouvée(s):`);
      allConversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.guest_name} (${conv.guest_phone}) - ID: ${conv.id}`);
        console.log(`      Propriété: ${conv.property_id}`);
        console.log(`      Créé le: ${conv.created_at}`);
      });
    } else {
      console.log('❌ Aucune conversation trouvée dans la base');
    }
    
    // 2. Lister tous les profils/utilisateurs
    console.log('\n2. Tous les profils/utilisateurs:');
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (profilesError) {
      console.error(`❌ Erreur: ${profilesError.message}`);
    } else if (allProfiles && allProfiles.length > 0) {
      console.log(`✓ ${allProfiles.length} profil(s) trouvé(s):`);
      allProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.email || 'Email non défini'} - ID: ${profile.id}`);
        const isTargetHost = profile.id === HOST_ID ? ' ⭐ (HÔTE RECHERCHÉ)' : '';
        console.log(`      Créé le: ${profile.created_at}${isTargetHost}`);
      });
    } else {
      console.log('❌ Aucun profil trouvé dans la base');
    }
    
    // 3. Lister toutes les propriétés
    console.log('\n3. Toutes les propriétés:');
    const { data: allProperties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, host_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (propertiesError) {
      console.error(`❌ Erreur: ${propertiesError.message}`);
    } else if (allProperties && allProperties.length > 0) {
      console.log(`✓ ${allProperties.length} propriété(s) trouvée(s):`);
      allProperties.forEach((prop, index) => {
        const isTargetHost = prop.host_id === HOST_ID ? ' ⭐ (HÔTE RECHERCHÉ)' : '';
        console.log(`   ${index + 1}. ${prop.name} - ID: ${prop.id}${isTargetHost}`);
        console.log(`      Host ID: ${prop.host_id}`);
        console.log(`      Créé le: ${prop.created_at}`);
      });
    } else {
      console.log('❌ Aucune propriété trouvée dans la base');
    }
    
    // 4. Rechercher spécifiquement les conversations liées à l'hôte recherché
    console.log(`\n4. Conversations liées à l'hôte ${HOST_ID}:`);
    const { data: hostConversations, error: hostConvError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        guest_phone,
        property_id,
        property:properties!inner(name, host_id)
      `)
      .eq('property.host_id', HOST_ID);
    
    if (hostConvError) {
      console.error(`❌ Erreur: ${hostConvError.message}`);
    } else if (hostConversations && hostConversations.length > 0) {
      console.log(`✓ ${hostConversations.length} conversation(s) trouvée(s) pour l'hôte:`);
      hostConversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.guest_name} (${conv.guest_phone})`);
        console.log(`      ID conversation: ${conv.id}`);
        console.log(`      Propriété: ${conv.property ? conv.property.name : 'Inconnue'}`);
      });
    } else {
      console.log('❌ Aucune conversation trouvée pour cet hôte');
    }
    
    // 5. Vérifier les numéros de téléphone visibles dans l'interface
    const phoneNumbers = ['+33665447372', '+33786658116'];
    console.log('\n5. Recherche par numéros de téléphone visibles dans l\'interface:');
    
    for (const phone of phoneNumbers) {
      const { data: phoneConversations, error: phoneError } = await supabase
        .from('conversations')
        .select(`
          id,
          guest_name,
          guest_phone,
          property_id,
          property:properties(name, host_id)
        `)
        .eq('guest_phone', phone);
      
      if (phoneError) {
        console.error(`❌ Erreur pour ${phone}: ${phoneError.message}`);
      } else if (phoneConversations && phoneConversations.length > 0) {
        console.log(`✓ Conversations trouvées pour ${phone}:`);
        phoneConversations.forEach(conv => {
          console.log(`   - ${conv.guest_name} (ID: ${conv.id})`);
          console.log(`     Host ID: ${conv.property ? conv.property.host_id : 'Inconnu'}`);
          console.log(`     Propriété: ${conv.property ? conv.property.name : 'Inconnue'}`);
        });
      } else {
        console.log(`❌ Aucune conversation trouvée pour ${phone}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors du diagnostic:`, error);
  }
}

// Exécuter le diagnostic
diagnosticDatabase();
