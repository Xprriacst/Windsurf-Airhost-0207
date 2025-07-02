/**
 * Script pour créer un template de bienvenue français personnalisé
 * Alternative au template hello_world en anglais
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Template de bienvenue français pour l'hospitalité
 * À créer via l'interface Meta Business Manager
 */
const templateBienvenueContent = {
  name: 'bienvenue_airhost',
  language: 'fr',
  category: 'UTILITY',
  components: [
    {
      type: 'BODY',
      text: `Bonjour {{1}} ! 👋

Bienvenue dans votre logement ! Nous sommes ravis de vous accueillir.

Voici quelques informations importantes :
📍 Check-in : {{2}}
📍 Check-out : {{3}}
🏠 Propriété : {{4}}

Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter via WhatsApp.

Nous vous souhaitons un excellent séjour ! 🌟`
    }
  ]
};

/**
 * Fonction pour simuler l'envoi du template de bienvenue français
 */
async function simulateWelcomeTemplateFrancais(guestPhone, guestName, checkIn, checkOut, propertyName) {
  console.log(`📱 Simulation envoi template bienvenue français à ${guestPhone}`);
  console.log(`👤 Invité : ${guestName}`);
  console.log(`🏨 Propriété : ${propertyName}`);
  console.log(`📅 Séjour : ${checkIn} → ${checkOut}`);
  
  const messageContent = templateBienvenueContent.components[0].text
    .replace('{{1}}', guestName)
    .replace('{{2}}', checkIn)
    .replace('{{3}}', checkOut)
    .replace('{{4}}', propertyName);
  
  console.log('\n📝 Message qui serait envoyé :');
  console.log('─'.repeat(50));
  console.log(messageContent);
  console.log('─'.repeat(50));
  
  return {
    success: true,
    template_name: 'bienvenue_airhost',
    language: 'fr',
    message: messageContent,
    recipient: guestPhone
  };
}

/**
 * Tester le template avec la conversation récemment créée
 */
async function testTemplateWithNewConversation() {
  try {
    console.log('🔍 Recherche de la conversation Test +33666497372...');
    
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        property:properties(name)
      `)
      .eq('guest_phone', '+33666497372')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !conversation) {
      console.error('❌ Conversation non trouvée:', error);
      return;
    }
    
    console.log('✅ Conversation trouvée:', {
      id: conversation.id,
      guest_name: conversation.guest_name,
      guest_phone: conversation.guest_phone,
      property_name: conversation.property?.name || 'Villa Côte d\'Azur',
      check_in: conversation.check_in_date,
      check_out: conversation.check_out_date
    });
    
    // Simuler l'envoi du template français
    const templateResult = await simulateWelcomeTemplateFrancais(
      conversation.guest_phone,
      conversation.guest_name,
      conversation.check_in_date,
      conversation.check_out_date,
      conversation.property?.name || 'Villa Côte d\'Azur'
    );
    
    console.log('\n✅ Template de bienvenue français testé avec succès !');
    return templateResult;
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    throw error;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🇫🇷 Test du template de bienvenue français');
  console.log('═'.repeat(60));
  
  console.log('\n📋 Template configuré :');
  console.log(`   Nom : ${templateBienvenueContent.name}`);
  console.log(`   Langue : ${templateBienvenueContent.language}`);
  console.log(`   Catégorie : ${templateBienvenueContent.category}`);
  
  console.log('\n📝 Contenu du template :');
  console.log(templateBienvenueContent.components[0].text);
  
  console.log('\n🧪 Test avec la conversation récente...');
  await testTemplateWithNewConversation();
  
  console.log('\n💡 Instructions pour utiliser ce template :');
  console.log('1. Créer ce template dans Meta Business Manager');
  console.log('2. Configurer les credentials WhatsApp dans l\'interface');
  console.log('3. Activer l\'envoi automatique des templates de bienvenue');
  console.log('4. Sélectionner "bienvenue_airhost" comme template par défaut');
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  templateBienvenueContent,
  simulateWelcomeTemplateFrancais,
  testTemplateWithNewConversation
};