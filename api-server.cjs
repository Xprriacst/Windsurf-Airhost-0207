const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Fonction d'analyse d'urgence (réplique de la fonction Netlify)
function analyzeEmergency(messages, propertyInfo = null, customInstructions = null) {
  if (!messages || messages.length === 0) {
    return {
      isEmergency: false,
      emergencyType: null,
      confidence: 1.0,
      unknownResponse: false,
      explanation: 'Aucun message à analyser'
    };
  }

  // Analyse du dernier message
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage.content.toLowerCase();
  
  // Mots-clés pour urgences critiques
  const criticalKeywords = ['urgent', 'fuite', 'inondation', 'panne', 'cassé', 'plus d\'eau', 'plus de chauffage', 'incendie', 'urgence', 'inondé', 'danger'];
  
  // Mots-clés pour plaintes
  const complaintKeywords = ['déçu', 'mécontent', 'sale', 'pas propre', 'problème', 'pas satisfait', 'mauvais', 'décevant', 'nul'];
  
  // Mots-clés pour escalade comportementale
  const behavioralKeywords = ['inacceptable', 'remboursement', 'avis négatif', 'scandaleux', 'arnaque', 'menace', 'avocat', 'pourri'];
  
  // Mots-clés positifs
  const positiveKeywords = ['merci', 'parfait', 'excellent', 'satisfait', 'bien', 'super', 'impeccable', 'génial'];

  if (criticalKeywords.some(keyword => content.includes(keyword))) {
    return {
      isEmergency: true,
      emergencyType: 'Urgence critique',
      confidence: 0.9,
      unknownResponse: false,
      explanation: 'Détection d\'urgence critique basée sur des mots-clés indiquant un problème grave nécessitant une intervention immédiate.',
      suggestedResponse: 'Nous prenons votre situation très au sérieux et allons intervenir immédiatement. Pouvez-vous nous donner plus de détails pour que nous puissions résoudre ce problème rapidement ?'
    };
  }

  if (behavioralKeywords.some(keyword => content.includes(keyword))) {
    return {
      isEmergency: true,
      emergencyType: 'Escalade comportementale',
      confidence: 0.85,
      unknownResponse: false,
      explanation: 'Détection d\'escalade comportementale avec menaces potentielles ou langage agressif nécessitant une intervention humaine.',
      suggestedResponse: 'Nous comprenons votre frustration et souhaitons résoudre cette situation rapidement. Permettez-nous de vous contacter directement pour trouver une solution satisfaisante.'
    };
  }

  if (complaintKeywords.some(keyword => content.includes(keyword))) {
    return {
      isEmergency: true,
      emergencyType: 'Client mécontent',
      confidence: 0.8,
      unknownResponse: false,
      explanation: 'Détection de mécontentement client nécessitant une attention particulière pour éviter une escalade.',
      suggestedResponse: 'Nous sommes désolés pour cette expérience qui ne correspond pas à nos standards. Pouvez-vous nous expliquer le problème en détail pour que nous puissions le résoudre ?'
    };
  }

  if (positiveKeywords.some(keyword => content.includes(keyword))) {
    return {
      isEmergency: false,
      emergencyType: 'Réponse connue',
      confidence: 0.9,
      unknownResponse: false,
      explanation: 'Message positif ne nécessitant pas d\'intervention urgente. Le client exprime sa satisfaction.',
      suggestedResponse: 'Merci beaucoup pour votre retour positif ! Nous sommes ravis que votre séjour se soit bien passé et espérons vous accueillir à nouveau bientôt.'
    };
  }

  // Par défaut : manque d'information
  return {
    isEmergency: true,
    emergencyType: 'IA incertaine',
    confidence: 0.6,
    unknownResponse: true,
    explanation: 'Le système ne peut pas déterminer avec certitude la nature de ce message. Une intervention humaine pourrait être nécessaire pour clarifier la demande.',
    suggestedResponse: 'Merci pour votre message. Un membre de notre équipe va examiner votre demande et vous répondre rapidement avec les informations appropriées.'
  };
}

// Endpoint pour l'analyse d'urgence (remplace la fonction Netlify)
app.post('/analyze-emergency', (req, res) => {
  try {
    console.log('[API] Analyse d\'urgence demandée');
    
    const { messages, conversationId, apartmentId, customInstructions } = req.body;
    
    if (!messages) {
      return res.status(400).json({
        error: 'Messages requis',
        isEmergency: false,
        emergencyType: null
      });
    }

    const analysis = analyzeEmergency(messages, null, customInstructions);
    
    console.log('[API] Analyse terminée:', analysis.emergencyType);
    
    res.json(analysis);
  } catch (error) {
    console.error('[API] Erreur lors de l\'analyse d\'urgence:', error);
    
    res.status(500).json({
      error: `Erreur lors de l'analyse: ${error.message}`,
      isEmergency: false,
      emergencyType: null
    });
  }
});

// Endpoint pour la génération de réponse IA (remplace la fonction Netlify)
app.post('/generate-ai-response', (req, res) => {
  try {
    console.log('[API] Génération de réponse IA demandée');
    
    const { messages, propertyInfo, customInstructions } = req.body;
    
    // Analyse du contexte pour générer une réponse appropriée
    const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
    
    if (!lastMessage) {
      return res.json({
        response: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
        confidence: 1.0
      });
    }

    const content = lastMessage.content.toLowerCase();
    let response = '';
    
    // Réponses contextuelles basées sur le contenu
    if (content.includes('wifi') || content.includes('internet')) {
      response = 'Le code WiFi est affiché dans le logement. Vous le trouverez généralement près de la box internet ou sur le frigo. Si vous ne le trouvez pas, n\'hésitez pas à me le signaler.';
    } else if (content.includes('check-in') || content.includes('arrivée') || content.includes('clés')) {
      response = 'Pour votre arrivée, vous recevrez les instructions détaillées par email 24h avant votre check-in. Les clés se trouvent dans la boîte sécurisée dont vous recevrez le code.';
    } else if (content.includes('parking') || content.includes('stationnement')) {
      response = 'Les informations concernant le stationnement sont détaillées dans le guide du logement. Un parking public se trouve à proximité si nécessaire.';
    } else if (content.includes('restaurant') || content.includes('manger')) {
      response = 'Je peux vous recommander d\'excellents restaurants dans le quartier ! Vous trouverez mes suggestions dans le guide du logement, avec les bonnes adresses locales.';
    } else if (content.includes('transport') || content.includes('métro') || content.includes('bus')) {
      response = 'Le logement est bien desservi par les transports en commun. La station la plus proche est indiquée dans le guide, avec les principales lignes pour vous déplacer facilement.';
    } else {
      response = 'Merci pour votre message. Je vais vérifier les informations et vous répondre rapidement. N\'hésitez pas si vous avez d\'autres questions !';
    }
    
    res.json({
      response: response,
      confidence: 0.8
    });
    
  } catch (error) {
    console.error('[API] Erreur lors de la génération de réponse:', error);
    
    res.status(500).json({
      error: `Erreur lors de la génération: ${error.message}`
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Airhost API Server',
    endpoints: [
      '/analyze-emergency',
      '/generate-ai-response'
    ],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur API Airhost démarré sur le port ${PORT}`);
  console.log(`Endpoints disponibles :`);
  console.log(`- POST /analyze-emergency (remplace fonction Netlify)`);
  console.log(`- POST /generate-ai-response (remplace fonction Netlify)`);
  console.log(`- GET /health`);
});