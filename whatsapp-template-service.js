/**
 * Service d'envoi de templates WhatsApp
 * Gère l'envoi de templates WhatsApp via l'API Meta Business
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuration CORS
app.use(cors());
app.use(express.json());

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Récupère les templates disponibles depuis l'API Meta
 */
app.get('/templates', async (req, res) => {
  try {
    // Pour l'instant, retourner des templates prédéfinis
    const templates = [
      {
        name: 'welcome_checkin',
        displayName: 'Bienvenue et instructions d\'arrivée',
        description: 'Message de bienvenue avec informations d\'arrivée'
      },
      {
        name: 'welcome_booking_confirmation',
        displayName: 'Confirmation de réservation',
        description: 'Confirmation de réservation avec détails'
      },
      {
        name: 'welcome_property_info',
        displayName: 'Informations sur la propriété',
        description: 'Informations détaillées sur la propriété'
      },
      {
        name: 'welcome_contact_host',
        displayName: 'Contact hôte disponible',
        description: 'Informations de contact de l\'hôte'
      },
      {
        name: 'welcome_custom',
        displayName: 'Message personnalisé',
        description: 'Template personnalisable'
      }
    ];
    
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Envoie un template WhatsApp
 */
app.post('/send-template', async (req, res) => {
  try {
    const { template_name, host_id, to, guest_name, property_id, test_mode = false } = req.body;
    
    console.log(`📧 Envoi du template ${template_name} à ${to} (Test: ${test_mode})`);
    
    // Récupérer la configuration WhatsApp
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, token')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (configError || !config) {
      throw new Error('Configuration WhatsApp non trouvée');
    }
    
    // Récupérer les informations de la propriété
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('name, address')
      .eq('id', property_id)
      .single();
    
    if (propError) {
      console.warn('Propriété non trouvée:', propError);
    }
    
    // Générer le contenu du template selon le type
    const templateContent = generateTemplateContent(template_name, {
      guest_name,
      property_name: property?.name || 'notre propriété',
      property_address: property?.address || ''
    });
    
    if (test_mode) {
      console.log(`✅ Mode test - Template ${template_name} généré:`, templateContent);
      return res.json({ 
        success: true, 
        message: 'Template envoyé en mode test', 
        template_content: templateContent 
      });
    }
    
    // Envoyer le template via l'API WhatsApp Business
    const whatsappResponse = await sendWhatsAppTemplate(config, {
      to,
      template_name,
      template_content: templateContent,
      guest_name
    });
    
    if (whatsappResponse.success) {
      console.log(`✅ Template ${template_name} envoyé avec succès à ${to}`);
      res.json({ success: true, message: 'Template envoyé avec succès', whatsapp_response: whatsappResponse });
    } else {
      throw new Error(`Erreur WhatsApp: ${whatsappResponse.error}`);
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi du template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Génère le contenu d'un template selon son type
 */
function generateTemplateContent(templateName, variables) {
  const templates = {
    welcome_checkin: `Bonjour ${variables.guest_name} ! 🏠
    
Bienvenue dans ${variables.property_name} ! Votre réservation est confirmée.

🔑 Instructions d'arrivée :
- Check-in possible dès 15h00
- Vous recevrez les codes d'accès 2h avant votre arrivée
- Parking disponible si mentionné dans votre réservation

📱 En cas de question, n'hésitez pas à me contacter.

Excellent séjour ! ✨`,

    welcome_booking_confirmation: `Bonjour ${variables.guest_name} ! 
    
✅ Votre réservation pour ${variables.property_name} est confirmée !

📍 Adresse : ${variables.property_address || 'Coordonnées envoyées séparément'}

📋 Prochaines étapes :
- Vous recevrez les détails d'arrivée 24h avant
- Check-in : 15h00 - Check-out : 11h00
- Toutes les informations pratiques vous seront communiquées

À bientôt ! 🏠`,

    welcome_property_info: `Bonjour ${variables.guest_name} ! 
    
🏠 Bienvenue dans ${variables.property_name} !

ℹ️ Informations importantes :
- WiFi gratuit (codes dans le logement)
- Toutes commodités incluses
- Guide des recommandations locales disponible
- Règlement intérieur affiché dans le logement

🛎️ Service client disponible 24h/7j pour toute question.

Profitez bien de votre séjour ! ✨`,

    welcome_contact_host: `Bonjour ${variables.guest_name} ! 
    
👋 Je suis votre hôte pour ${variables.property_name}.

📞 Contact direct :
- WhatsApp : Ce numéro
- Disponible 7j/7 de 8h à 22h
- Urgences : Contact immédiat possible

🤝 Je suis là pour vous aider à passer un excellent séjour !

N'hésitez pas à me poser toutes vos questions. 😊`,

    welcome_custom: `Bonjour ${variables.guest_name} ! 
    
Bienvenue dans ${variables.property_name} ! 

Votre hôte est disponible pour toute question.

Excellent séjour ! 🏠`
  };
  
  return templates[templateName] || templates.welcome_custom;
}

/**
 * Envoie le template via l'API WhatsApp Business
 */
async function sendWhatsAppTemplate(config, templateData) {
  try {
    // Pour l'instant, simuler l'envoi
    // TODO: Intégrer avec l'API Meta WhatsApp Business réelle
    console.log('Simulation envoi WhatsApp:', {
      phone_number_id: config.phone_number_id,
      to: templateData.to,
      content: templateData.template_content
    });
    
    return { success: true, message_id: `msg_${Date.now()}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Test de santé du service
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'WhatsApp Template Service', timestamp: new Date().toISOString() });
});

/**
 * Endpoint de test avec template par défaut
 */
app.post('/test-template', async (req, res) => {
  try {
    const testData = {
      template_name: 'welcome_checkin',
      host_id: 'test-host',
      to: '+33123456789',
      guest_name: 'Client Test',
      property_id: 'test-property',
      test_mode: true
    };
    
    const result = await req.app.request.post('/send-template', { body: JSON.stringify(testData) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Service de templates WhatsApp démarré sur le port ${PORT}`);
  console.log(`📍 Endpoints disponibles:`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/templates`);
  console.log(`   POST http://localhost:${PORT}/send-template`);
  console.log(`   POST http://localhost:${PORT}/test-template`);
});