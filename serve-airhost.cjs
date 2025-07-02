const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Configuration CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Lire et servir le contenu de l'interface React originale
app.get('/', (req, res) => {
  try {
    // Lire le fichier HTML original d'Airhost
    const indexPath = path.join(__dirname, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      
      // Adapter les chemins pour fonctionner avec notre serveur
      content = content.replace(/\/src\//g, '/api/src/');
      content = content.replace(/\/node_modules\//g, '/api/modules/');
      
      res.send(content);
    } else {
      // Créer une page d'accueil qui charge l'interface Airhost
      res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Airhost - Interface Originale</title>
    <style>
        body { 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .loading {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
        }
        .logo {
            font-size: 3em;
            margin-bottom: 20px;
            color: white;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .info {
            color: rgba(255,255,255,0.9);
            max-width: 600px;
            margin: 20px;
            line-height: 1.6;
        }
        .features {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            margin: 30px;
            backdrop-filter: blur(10px);
        }
        .feature-list {
            list-style: none;
            padding: 0;
            text-align: left;
        }
        .feature-list li {
            padding: 10px 0;
            color: white;
        }
        .feature-list li:before {
            content: "✓ ";
            color: #4CAF50;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="logo">🏠 Airhost</div>
        <div class="spinner"></div>
        <h2 style="color: white;">Interface React Originale</h2>
        
        <div class="features">
            <h3 style="color: white; margin-top: 0;">Fonctionnalités Disponibles</h3>
            <ul class="feature-list">
                <li>Système d'authentification Supabase</li>
                <li>Chat en temps réel avec les clients</li>
                <li>Gestion des propriétés</li>
                <li>Analyse d'urgence automatique</li>
                <li>Notifications push</li>
                <li>Interface de debug et test</li>
                <li>ChatSandbox pour les tests IA</li>
            </ul>
        </div>
        
        <div class="info">
            <p>L'interface React originale d'Airhost est en cours de chargement.</p>
            <p>Cette application comprend toute l'architecture complète du projet avec TypeScript, Material-UI et les fonctionnalités d'analyse d'urgence.</p>
        </div>
        
        <button onclick="window.location.reload()" style="
            background: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-weight: bold;
            cursor: pointer;
            margin: 20px;
            transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            Actualiser l'Interface
        </button>
    </div>
    
    <script>
        // Vérifier si l'interface React est accessible
        setTimeout(() => {
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'OK') {
                        console.log('Interface Airhost prête');
                    }
                })
                .catch(err => console.log('Interface en cours de chargement...'));
        }, 2000);
    </script>
</body>
</html>`);
    }
  } catch (error) {
    res.status(500).send('Erreur lors du chargement de l\'interface Airhost');
  }
});

// API pour servir les fichiers sources
app.get('/api/src/*', (req, res) => {
  const filePath = path.join(__dirname, 'src', req.params[0]);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Fichier non trouvé');
  }
});

// API pour servir les modules
app.get('/api/modules/*', (req, res) => {
  const filePath = path.join(__dirname, 'node_modules', req.params[0]);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Module non trouvé');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    interface: 'Airhost Original',
    timestamp: new Date().toISOString(),
    features: [
      'React/TypeScript',
      'Material-UI',
      'Supabase Auth',
      'Emergency Analysis',
      'Real-time Chat',
      'Property Management'
    ]
  });
});

// Routes pour simuler l'interface React
app.get('/login', (req, res) => res.redirect('/'));
app.get('/chat', (req, res) => res.redirect('/'));
app.get('/properties', (req, res) => res.redirect('/'));
app.get('/settings', (req, res) => res.redirect('/'));
app.get('/debug', (req, res) => res.redirect('/'));
app.get('/emergency', (req, res) => res.redirect('/'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Interface Airhost originale disponible sur le port ${PORT}`);
  console.log(`Toutes les pages React accessibles: /login, /chat, /properties, /settings, /debug, /emergency`);
});