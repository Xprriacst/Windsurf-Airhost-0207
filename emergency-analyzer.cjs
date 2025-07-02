/**
 * Analyseur d'urgences et d'escalades pour Airhost
 * Version améliorée avec serveur de développement intégré
 */

const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration des middlewares
app.use(cors());
app.use(express.json());

// Configuration des clients API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Fonction d'analyse d'urgence améliorée
 */
async function analyzeEmergency(messages, propertyInfo = null, customInstructions = null) {
  try {
    console.log('🔍 Début de l\'analyse d\'urgence');
    console.log(`📝 Nombre de messages à analyser: ${messages.length}`);
    
    // Construction du contexte de propriété
    let propertyContext = '';
    if (propertyInfo) {
      propertyContext = `
INFORMATIONS SUR LE LOGEMENT:
Nom: ${propertyInfo.name || 'Non spécifié'}
Adresse: ${propertyInfo.address || 'Non spécifiée'}
Équipements: ${propertyInfo.amenities || 'Non spécifiés'}
Règles: ${propertyInfo.house_rules || 'Non spécifiées'}
FAQ: ${propertyInfo.faq || 'Non spécifiée'}
`;
    }

    // Instructions personnalisées
    const instructions = customInstructions || propertyInfo?.ai_instructions || '';

    // Prompt système amélioré
    const systemPrompt = `Tu es un assistant spécialisé dans l'analyse de conversations client pour détecter les urgences et cas d'escalade.

Analyse le dernier message et classe-le dans l'une de ces catégories:

1. SITUATION NORMALE (isEmergency: false)
   - Questions avec réponses disponibles dans les instructions
   - Salutations, remerciements
   - Demandes d'informations couvertes par la documentation

2. INFORMATION MANQUANTE (isEmergency: true, emergencyType: "IA incertaine")
   - Questions dont la réponse n'est PAS dans les instructions
   - Demandes d'informations non documentées
   - Nécessite contact avec l'hôte

3. PROBLÈME CLIENT (isEmergency: true, emergencyType selon gravité)
   - "Client mécontent": Plaintes, insatisfaction
   - "Problème avec le logement": Dysfonctionnements équipements
   - "Urgence critique": Fuites, pannes majeures, sécurité

4. ESCALADE COMPORTEMENTALE (isEmergency: true, emergencyType: "Escalade comportementale")
   - Ton agressif, menaces
   - Demandes déraisonnables répétées
   - Comportement inapproprié

${propertyContext}

${instructions ? `INSTRUCTIONS SPÉCIFIQUES:\n${instructions}` : ''}

Réponds UNIQUEMENT en JSON:
{
  "isEmergency": boolean,
  "emergencyType": string | null,
  "confidence": number (0-1),
  "urgencyLevel": "low" | "medium" | "high" | "critical",
  "unknownResponse": boolean,
  "explanation": string,
  "suggestedAction": string,
  "keywordDetected": string[]
}`;

    // Formatage des messages pour OpenAI
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    // Appel à OpenAI
    console.log('🤖 Envoi à OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: formattedMessages,
      temperature: 0.2,
      max_tokens: 1000
    });

    // Parsing de la réponse
    const analysisText = response.choices[0].message.content;
    console.log('📊 Réponse OpenAI reçue:', analysisText);

    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      // Fallback avec analyse de mots-clés
      analysisResult = performKeywordAnalysis(messages[messages.length - 1]?.content || '');
    }

    // Ajout de métadonnées
    analysisResult.timestamp = new Date().toISOString();
    analysisResult.messageCount = messages.length;
    analysisResult.hasPropertyInfo = !!propertyInfo;

    console.log('✅ Analyse terminée:', {
      isEmergency: analysisResult.isEmergency,
      type: analysisResult.emergencyType,
      urgency: analysisResult.urgencyLevel
    });

    return analysisResult;

  } catch (error) {
    console.error('❌ Erreur analyse d\'urgence:', error);
    throw error;
  }
}

/**
 * Analyse de secours basée sur mots-clés
 */
function performKeywordAnalysis(messageContent) {
  const content = messageContent.toLowerCase();
  
  // Mots-clés d'urgence critique
  const criticalKeywords = ['fuite', 'inondation', 'feu', 'fumée', 'gaz', 'électricité', 'urgent', 'danger'];
  // Mots-clés de mécontentement
  const complaintKeywords = ['déçu', 'mécontent', 'sale', 'cassé', 'nul', 'horrible', 'remboursement'];
  // Mots-clés d'escalade
  const escalationKeywords = ['avocat', 'procès', 'plainte', 'scandale', 'inacceptable'];
  
  let isEmergency = false;
  let emergencyType = null;
  let urgencyLevel = 'low';
  let keywordDetected = [];

  if (criticalKeywords.some(keyword => content.includes(keyword))) {
    isEmergency = true;
    emergencyType = 'Urgence critique';
    urgencyLevel = 'critical';
    keywordDetected = criticalKeywords.filter(keyword => content.includes(keyword));
  } else if (escalationKeywords.some(keyword => content.includes(keyword))) {
    isEmergency = true;
    emergencyType = 'Escalade comportementale';
    urgencyLevel = 'high';
    keywordDetected = escalationKeywords.filter(keyword => content.includes(keyword));
  } else if (complaintKeywords.some(keyword => content.includes(keyword))) {
    isEmergency = true;
    emergencyType = 'Client mécontent';
    urgencyLevel = 'medium';
    keywordDetected = complaintKeywords.filter(keyword => content.includes(keyword));
  }

  return {
    isEmergency,
    emergencyType,
    confidence: 0.7,
    urgencyLevel,
    unknownResponse: false,
    explanation: `Analyse par mots-clés. Détecté: ${keywordDetected.join(', ')}`,
    suggestedAction: isEmergency ? 'Contacter l\'hôte immédiatement' : 'Réponse automatique possible',
    keywordDetected
  };
}

// Route principale d'analyse
app.post('/analyze-emergency', async (req, res) => {
  try {
    const { messages, propertyInfo, customInstructions } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages requis et non vides'
      });
    }

    const result = await analyzeEmergency(messages, propertyInfo, customInstructions);
    res.json(result);

  } catch (error) {
    console.error('Erreur API:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
});

// Route de test rapide
app.post('/test-emergency', async (req, res) => {
  const { message, severity = 'normal' } = req.body;
  
  const testMessages = [
    {
      content: message || 'Message de test',
      direction: 'inbound',
      timestamp: new Date().toISOString()
    }
  ];

  try {
    const result = await analyzeEmergency(testMessages);
    res.json({
      originalMessage: message,
      analysis: result,
      testSeverity: severity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    openai: !!process.env.OPENAI_API_KEY,
    supabase: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
  });
});

// Page d'accueil avec interface de test
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analyseur d'Urgences Airhost</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 10px 0; }
        textarea { width: 100%; height: 100px; margin: 10px 0; padding: 10px; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a87; }
        .result { background: white; padding: 15px; border-radius: 4px; margin: 10px 0; border-left: 4px solid #007cba; }
        .emergency { border-left-color: #e74c3c; }
        .critical { border-left-color: #c0392b; }
    </style>
</head>
<body>
    <h1>🚨 Analyseur d'Urgences Airhost</h1>
    
    <div class="container">
        <h3>Test rapide d'analyse</h3>
        <textarea id="messageInput" placeholder="Saisissez un message client à analyser...">Il y a une fuite d'eau dans la salle de bain, ça coule partout !</textarea>
        <br>
        <button onclick="analyzeMessage()">Analyser le message</button>
    </div>

    <div id="results"></div>

    <script>
        async function analyzeMessage() {
            const message = document.getElementById('messageInput').value;
            const resultsDiv = document.getElementById('results');
            
            resultsDiv.innerHTML = '<div class="result">🔄 Analyse en cours...</div>';
            
            try {
                const response = await fetch('/test-emergency', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                
                const data = await response.json();
                const analysis = data.analysis;
                
                const urgencyClass = analysis.urgencyLevel === 'critical' ? 'critical' : 
                                   analysis.isEmergency ? 'emergency' : '';
                
                resultsDiv.innerHTML = \`
                    <div class="result \${urgencyClass}">
                        <h4>📊 Résultat de l'analyse</h4>
                        <p><strong>Urgence:</strong> \${analysis.isEmergency ? '🚨 OUI' : '✅ NON'}</p>
                        <p><strong>Type:</strong> \${analysis.emergencyType || 'Aucun'}</p>
                        <p><strong>Niveau d'urgence:</strong> \${analysis.urgencyLevel}</p>
                        <p><strong>Confiance:</strong> \${Math.round(analysis.confidence * 100)}%</p>
                        <p><strong>Explication:</strong> \${analysis.explanation}</p>
                        <p><strong>Action suggérée:</strong> \${analysis.suggestedAction}</p>
                        \${analysis.keywordDetected?.length ? \`<p><strong>Mots-clés détectés:</strong> \${analysis.keywordDetected.join(', ')}</p>\` : ''}
                    </div>
                \`;
            } catch (error) {
                resultsDiv.innerHTML = '<div class="result emergency">❌ Erreur: ' + error.message + '</div>';
            }
        }
    </script>
</body>
</html>
  `);
});

// Démarrage du serveur
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur d'analyse d'urgence démarré sur le port ${PORT}`);
    console.log(`🌐 Interface web: http://localhost:${PORT}`);
    console.log(`🔧 API health check: http://localhost:${PORT}/health`);
  });
}

module.exports = { app, analyzeEmergency };