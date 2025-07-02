/**
 * Test du template hello_world pour validation initiale
 */

console.log('🌍 Test du template Hello World');
console.log('═'.repeat(50));

// Tester la création d'une nouvelle conversation avec hello_world
async function testHelloWorldTemplate() {
  try {
    console.log('📞 Test de création de conversation avec template hello_world');
    
    const testData = {
      guest_name: "Hello World Test",
      guest_phone: "+33666123456",
      property_name: "Villa Côte d'Azur",
      check_in_date: "2025-06-25",
      check_out_date: "2025-06-28",
      host_email: "contact.polaris.ia@gmail.com"
    };
    
    console.log('📋 Données de test:', testData);
    
    const response = await fetch('http://localhost:3002/create-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Conversation créée avec succès!');
      console.log('🆔 ID:', result.conversation_id);
      console.log('📱 Téléphone:', result.guest_phone);
      console.log('🏠 Propriété:', result.property_name);
      
      if (result.template_sent) {
        console.log('📤 Template envoyé:', result.template_name);
        console.log('📝 Message:', result.template_message);
      } else {
        console.log('⚠️ Template non envoyé:', result.template_error || 'Pas de configuration');
      }
    } else {
      console.log('❌ Erreur lors de la création:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.log('❌ Erreur de test:', error.message);
    return { success: false, error: error.message };
  }
}

// Afficher les avantages du template hello_world pour les tests
function explainHelloWorldChoice() {
  console.log('\n💡 Pourquoi commencer avec hello_world:');
  console.log('✓ Template existant, pas besoin de création');
  console.log('✓ Toujours disponible dans Meta Business API');
  console.log('✓ Permet de tester la mécanique d\'envoi');
  console.log('✓ Validation que les credentials fonctionnent');
  console.log('✓ Base solide avant templates personnalisés');
  
  console.log('\n📋 Contenu du template hello_world:');
  console.log('   "Hello World"');
  console.log('   "Welcome and congratulations! This message demonstrates..."');
  console.log('   → Message générique mais fonctionnel pour les tests');
}

// Instructions pour la configuration
function printConfigurationSteps() {
  console.log('\n🔧 Configuration requise pour les tests:');
  console.log('1. Aller dans l\'interface Airhost');
  console.log('2. Cliquer sur Configuration WhatsApp');
  console.log('3. Saisir vos credentials:');
  console.log('   - Phone Number ID');
  console.log('   - WhatsApp Token');  
  console.log('4. Activer l\'envoi de templates');
  console.log('5. Sélectionner "Hello World (Anglais)"');
  console.log('6. Sauvegarder');
  
  console.log('\n✅ Une fois configuré:');
  console.log('- Nouvelles conversations recevront hello_world');
  console.log('- Vous verrez les messages dans l\'interface');
  console.log('- Validation complète du système');
}

// Exécuter le test
async function runTest() {
  explainHelloWorldChoice();
  printConfigurationSteps();
  
  console.log('\n🚀 Lancement du test...');
  const result = await testHelloWorldTemplate();
  
  console.log('\n📊 Résultat du test:');
  if (result.success) {
    console.log('✅ Système opérationnel avec hello_world');
    console.log('🎯 Prêt pour la configuration des credentials');
  } else {
    console.log('⚠️ Configuration requise avant test complet');
    console.log('💡 Lancez d\'abord l\'interface pour configurer');
  }
}

runTest();