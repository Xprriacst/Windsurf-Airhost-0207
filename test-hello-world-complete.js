/**
 * Test complet du template hello_world après configuration
 */

async function testCompleteHelloWorld() {
  console.log('🌍 Test complet du template Hello World');
  console.log('═'.repeat(50));
  
  try {
    // Créer une nouvelle conversation pour déclencher le template
    const testData = {
      guest_name: "Test Hello World",
      guest_phone: "+33666888999",
      property_id: "a0624296-4e92-469c-9be2-dcbe8ff547c2", // Villa Côte d'Azur existante
      check_in_date: "2025-06-25",
      check_out_date: "2025-06-28"
    };
    
    console.log('📞 Création d\'une nouvelle conversation...');
    console.log('📋 Données:', testData);
    
    const response = await fetch('http://localhost:3002/create-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Conversation créée:', result.conversation_id);
      
      if (result.template_sent) {
        console.log('🎯 Template hello_world envoyé avec succès !');
        console.log('📱 Numéro:', result.guest_phone);
        console.log('📝 Template utilisé:', result.template_name);
        console.log('📤 Message envoyé:', result.template_message);
        
        console.log('\n🎉 TEST RÉUSSI !');
        console.log('✓ Configuration WhatsApp fonctionnelle');
        console.log('✓ Template hello_world envoyé automatiquement');
        console.log('✓ Nouvelle conversation créée dans l\'interface');
        
      } else {
        console.log('⚠️ Conversation créée mais template non envoyé');
        console.log('Raison:', result.template_error);
      }
    } else {
      console.log('❌ Erreur:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.log('❌ Erreur de test:', error.message);
    return { success: false, error: error.message };
  }
}

// Instructions pour la suite
function printNextSteps() {
  console.log('\n📋 Prochaines étapes après validation hello_world:');
  console.log('1. 🇫🇷 Créer le template français dans Meta Business Manager');
  console.log('   - Nom: bienvenue_airhost');
  console.log('   - Langue: Français');
  console.log('   - Contenu personnalisé pour l\'hospitalité');
  
  console.log('\n2. 🔄 Modifier la configuration dans l\'interface');
  console.log('   - Sélectionner "Bienvenue Airhost (Français)"');
  console.log('   - Sauvegarder');
  
  console.log('\n3. ✅ Résultat final:');
  console.log('   - Messages de bienvenue en français');
  console.log('   - Contenu adapté à l\'hospitalité');
  console.log('   - Envoi automatique pour chaque nouvelle réservation');
}

testCompleteHelloWorld().then(() => {
  printNextSteps();
});