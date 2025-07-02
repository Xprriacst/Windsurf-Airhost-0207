/**
 * Script d'analyse de la base de données de production
 * Compare la structure avec l'environnement de développement
 * Génère un plan de migration pour le système de tags d'urgence
 */

import { createClient } from '@supabase/supabase-js';

// Configuration production (Airhost-REC)
const prodUrl = process.env.PROD_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const prodKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Configuration développement (Airhost Emergency Feature)
const devUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const devKey = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

const prodSupabase = createClient(prodUrl, prodKey);
const devSupabase = devKey ? createClient(devUrl, devKey) : null;

async function analyzeDatabase(url, key, label) {
  console.log(`\n🔍 Analyse de la base ${label}:`);
  console.log(`   URL: ${url}`);
  
  const supabase = createClient(url, key);
  const results = {};
  
  try {
    // 1. Analyser les utilisateurs
    console.log('👥 Utilisateurs:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('   ❌ Erreur auth.users:', authError.message);
      results.authUsers = { error: authError.message };
    } else {
      console.log(`   ✅ ${authUsers.users?.length || 0} utilisateur(s) dans auth.users`);
      results.authUsers = { count: authUsers.users?.length || 0, users: authUsers.users };
      authUsers.users?.forEach(user => 
        console.log(`     - ${user.email} (${user.id})`)
      );
    }
    
    // 2. Analyser les propriétés
    console.log('\n🏠 Propriétés:');
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*');
    
    if (propError) {
      console.log('   ❌ Erreur properties:', propError.message);
      results.properties = { error: propError.message };
    } else {
      console.log(`   ✅ ${properties?.length || 0} propriété(s)`);
      results.properties = { count: properties?.length || 0, data: properties };
      properties?.forEach(prop => 
        console.log(`     - ${prop.name} (${prop.id}) → host_id: ${prop.host_id}`)
      );
    }
    
    // 3. Analyser les conversations
    console.log('\n💬 Conversations:');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .limit(10);
    
    if (convError) {
      console.log('   ❌ Erreur conversations:', convError.message);
      results.conversations = { error: convError.message };
    } else {
      console.log(`   ✅ ${conversations?.length || 0} conversation(s) (échantillon)`);
      results.conversations = { count: conversations?.length || 0, sample: conversations };
      
      const withProperty = conversations?.filter(c => c.property_id) || [];
      const withoutProperty = conversations?.filter(c => !c.property_id) || [];
      
      console.log(`     - Avec property_id: ${withProperty.length}`);
      console.log(`     - Sans property_id: ${withoutProperty.length}`);
    }
    
    // 4. Rechercher catheline et l'Opale
    console.log('\n🎯 Recherche de catheline et l\'Opale:');
    
    // Chercher catheline dans auth.users
    const cathelineUser = results.authUsers.users?.find(u => 
      u.email === 'catheline@agences-placid.com'
    );
    
    if (cathelineUser) {
      console.log(`   ✅ Catheline trouvée: ${cathelineUser.id}`);
      results.catheline = { id: cathelineUser.id, email: cathelineUser.email };
      
      // Chercher ses propriétés
      const cathelineProps = properties?.filter(p => p.host_id === cathelineUser.id);
      console.log(`   🏠 Propriétés de catheline: ${cathelineProps?.length || 0}`);
      cathelineProps?.forEach(prop => 
        console.log(`     - ${prop.name} (${prop.id})`)
      );
      
      // Chercher spécifiquement l'Opale
      const opale = cathelineProps?.find(p => 
        p.name?.toLowerCase().includes('opale')
      );
      
      if (opale) {
        console.log(`   🎯 L'Opale trouvée: ${opale.name} (${opale.id})`);
        results.opale = opale;
        
        // Chercher les conversations de l'Opale
        const opaleConversations = conversations?.filter(c => c.property_id === opale.id);
        console.log(`   💬 Conversations de l'Opale: ${opaleConversations?.length || 0}`);
        results.opaleConversations = opaleConversations;
      } else {
        console.log('   ❌ L\'Opale non trouvée dans les propriétés');
        results.opale = null;
      }
    } else {
      console.log('   ❌ Catheline non trouvée');
      results.catheline = null;
    }
    
    return results;
    
  } catch (error) {
    console.error(`❌ Erreur générale pour ${label}:`, error.message);
    return { error: error.message };
  }
}

function compareStructures(prodResults, devResults) {
  console.log('\n📊 COMPARAISON DES STRUCTURES:');
  
  // Comparer les utilisateurs
  const prodUsers = prodResults.authUsers?.count || 0;
  const devUsers = devResults?.authUsers?.count || 0;
  console.log(`👥 Utilisateurs: Prod(${prodUsers}) vs Dev(${devUsers})`);
  
  // Comparer les propriétés
  const prodProps = prodResults.properties?.count || 0;
  const devProps = devResults?.properties?.count || 0;
  console.log(`🏠 Propriétés: Prod(${prodProps}) vs Dev(${devProps})`);
  
  // Comparer les conversations
  const prodConvs = prodResults.conversations?.count || 0;
  const devConvs = devResults?.conversations?.count || 0;
  console.log(`💬 Conversations: Prod(${prodConvs}) vs Dev(${devConvs})`);
  
  // État de catheline dans chaque base
  console.log('\n🎯 État de catheline:');
  console.log(`   Prod: ${prodResults.catheline ? '✅ Présente' : '❌ Absente'}`);
  console.log(`   Dev: ${devResults?.catheline ? '✅ Présente' : '❌ Absente'}`);
  
  if (prodResults.opale) {
    console.log(`   Opale en prod: ✅ ${prodResults.opale.name} (${prodResults.opale.id})`);
  } else {
    console.log(`   Opale en prod: ❌ Non trouvée`);
  }
}

function generateMigrationPlan(comparison, prodResults, devResults) {
  console.log('\n📋 PLAN DE MIGRATION:');
  
  if (!prodResults.catheline) {
    console.log('1. ❌ PROBLÈME CRITIQUE: Catheline absente de la production');
    console.log('   → Action: Créer ou identifier le bon utilisateur catheline');
  }
  
  if (!prodResults.opale) {
    console.log('2. ❌ PROBLÈME: L\'Opale absente de la production');
    console.log('   → Action: Créer la propriété Opale pour catheline');
  }
  
  console.log('\n💡 ACTIONS RECOMMANDÉES:');
  console.log('1. Identifier/créer catheline@agences-placid.com en production');
  console.log('2. Créer/identifier la propriété "Opale" pour catheline');
  console.log('3. Lier les conversations appropriées à l\'Opale');
  console.log('4. Mettre à jour le code avec les bons IDs');
}

async function main() {
  console.log('🚀 Analyse comparative des bases de données Airhost');
  console.log('=' .repeat(60));
  
  // Analyser la production
  const prodResults = await analyzeDatabase(prodUrl, prodKey, 'PRODUCTION (Airhost-REC)');
  
  // Analyser le développement si possible
  let devResults = null;
  if (devSupabase) {
    devResults = await analyzeDatabase(devUrl, devKey, 'DÉVELOPPEMENT (Airhost Emergency Feature)');
  } else {
    console.log('\n⚠️ Clé de développement non disponible, analyse production uniquement');
  }
  
  // Comparer les structures
  if (devResults) {
    compareStructures(prodResults, devResults);
  }
  
  // Générer le plan de migration
  generateMigrationPlan({}, prodResults, devResults);
  
  console.log('\n✅ Analyse terminée');
}

main();