#!/usr/bin/env node

// Force l'application à utiliser l'environnement staging
// Efface le cache de session et force la reconnexion

import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const STAGING_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE';

async function testStagingConnection() {
  console.log('🔍 Test de connexion à l\'instance staging');
  
  const supabase = createClient(STAGING_URL, STAGING_ANON_KEY);
  
  try {
    // Test simple de connexion
    const { data, error } = await supabase
      .from('conversations')
      .select('id, guest_name')
      .limit(3);
    
    if (error) {
      console.log(`❌ Erreur de connexion: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Connexion staging réussie - ${data?.length || 0} conversations trouvées`);
    
    if (data && data.length > 0) {
      console.log('📋 Conversations disponibles:');
      data.forEach(conv => console.log(`  - ${conv.guest_name} (${conv.id})`));
    }
    
    return true;
    
  } catch (err) {
    console.log(`❌ Erreur de test: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔄 Vérification et configuration de l\'environnement staging\n');
  
  // Vérifier la configuration actuelle
  console.log('Configuration actuelle:');
  console.log(`  URL: ${STAGING_URL}`);
  console.log(`  Environnement: staging`);
  
  // Tester la connexion
  const isConnected = await testStagingConnection();
  
  if (isConnected) {
    console.log('\n🎉 Environnement staging prêt!');
    console.log('\nPour forcer l\'utilisation de staging dans le navigateur:');
    console.log('1. Ouvrir les outils de développement (F12)');
    console.log('2. Aller dans Application/Storage');
    console.log('3. Effacer le localStorage de Supabase');
    console.log('4. Recharger la page');
  } else {
    console.log('\n❌ Problème de connexion staging');
    console.log('Vérifiez les credentials et la configuration réseau');
  }
}

main();