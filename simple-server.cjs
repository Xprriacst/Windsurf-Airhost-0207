const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Servir l'interface principale d'analyse d'urgence
  if (pathname === '/' || pathname === '/index.html') {
    fs.readFile('airhost-emergency-analyzer.html', 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Fichier non trouvé');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // API pour l'analyse d'urgence (système de secours)
  if (pathname === '/api/analyze-emergency' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const analysis = analyzeEmergency(data.message || '');
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify(analysis));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Données invalides' }));
      }
    });
    return;
  }

  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // API Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      openai: !!process.env.OPENAI_API_KEY,
      analyzer: 'active'
    }));
    return;
  }

  // 404 pour les autres routes
  res.writeHead(404);
  res.end('Page non trouvée');
});

// Fonction d'analyse d'urgence basée sur mots-clés
function analyzeEmergency(content) {
  const lowerContent = content.toLowerCase();
  
  // Mots-clés pour urgences critiques
  const criticalKeywords = ['urgent', 'fuite', 'inondation', 'panne', 'cassé', 'plus d\'eau', 'plus de chauffage', 'incendie', 'urgence', 'inondé'];
  
  // Mots-clés pour plaintes
  const complaintKeywords = ['déçu', 'mécontent', 'sale', 'pas propre', 'problème', 'pas satisfait', 'mauvais', 'décevant'];
  
  // Mots-clés pour escalade comportementale
  const behavioralKeywords = ['inacceptable', 'remboursement', 'avis négatif', 'scandaleux', 'arnaque', 'menace', 'avocat'];
  
  // Mots-clés positifs
  const positiveKeywords = ['merci', 'parfait', 'excellent', 'satisfait', 'bien', 'super', 'impeccable'];

  if (criticalKeywords.some(keyword => lowerContent.includes(keyword))) {
    return {
      isEmergency: true,
      emergencyType: 'Urgence critique',
      confidence: 0.9,
      unknownResponse: false,
      explanation: 'Détection d\'urgence critique basée sur des mots-clés indiquant un problème grave nécessitant une intervention immédiate.',
      suggestedResponse: 'Nous prenons votre situation très au sérieux et allons intervenir immédiatement. Pouvez-vous nous donner plus de détails pour que nous puissions résoudre ce problème rapidement ?'
    };
  }

  if (behavioralKeywords.some(keyword => lowerContent.includes(keyword))) {
    return {
      isEmergency: true,
      emergencyType: 'Escalade comportementale',
      confidence: 0.85,
      unknownResponse: false,
      explanation: 'Détection d\'escalade comportementale avec menaces potentielles ou langage agressif nécessitant une intervention humaine.',
      suggestedResponse: 'Nous comprenons votre frustration et souhaitons résoudre cette situation rapidement. Permettez-nous de vous contacter directement pour trouver une solution satisfaisante.'
    };
  }

  if (complaintKeywords.some(keyword => lowerContent.includes(keyword))) {
    return {
      isEmergency: true,
      emergencyType: 'Client mécontent',
      confidence: 0.8,
      unknownResponse: false,
      explanation: 'Détection de mécontentement client nécessitant une attention particulière pour éviter une escalade.',
      suggestedResponse: 'Nous sommes désolés pour cette expérience qui ne correspond pas à nos standards. Pouvez-vous nous expliquer le problème en détail pour que nous puissions le résoudre ?'
    };
  }

  if (positiveKeywords.some(keyword => lowerContent.includes(keyword))) {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Analyseur d'urgence Airhost disponible sur le port ${PORT}`);
  console.log(`Accédez à: http://localhost:${PORT}`);
});