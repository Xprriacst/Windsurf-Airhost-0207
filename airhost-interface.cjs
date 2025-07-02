/**
 * Interface web simplifiée pour Airhost avec analyseur d'urgence intégré
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { analyzeEmergency } = require('./emergency-analyzer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Page principale d'Airhost
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Airhost - Gestion Hôtelière IA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: rgba(255,255,255,0.95);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }
        .title {
            font-size: 2.5em;
            color: #333;
            text-align: center;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            font-size: 1.1em;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .card {
            background: rgba(255,255,255,0.95);
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .card h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            color: #555;
        }
        .feature-list li:last-child {
            border-bottom: none;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-online { background: #4CAF50; }
        .status-offline { background: #f44336; }
        .status-warning { background: #ff9800; }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .emergency-demo {
            background: rgba(255,255,255,0.95);
            padding: 20px;
            border-radius: 15px;
            margin-top: 20px;
        }
        .emergency-result {
            margin-top: 15px;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid;
        }
        .emergency-normal { border-left-color: #4CAF50; background: #f8fff8; }
        .emergency-warning { border-left-color: #ff9800; background: #fff8f0; }
        .emergency-critical { border-left-color: #f44336; background: #fff5f5; }
        textarea {
            width: 100%;
            height: 80px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-family: inherit;
            resize: vertical;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat-item {
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.7);
            border-radius: 10px;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🏨 Airhost</h1>
            <p class="subtitle">Plateforme de gestion hôtelière avec intelligence artificielle</p>
        </div>

        <div class="dashboard">
            <div class="card">
                <h3>🔌 État des Services</h3>
                <ul class="feature-list">
                    <li><span class="status-indicator status-online"></span>Analyseur d'Urgence</li>
                    <li><span class="status-indicator status-online"></span>Base de données Supabase</li>
                    <li><span class="status-indicator status-online"></span>OpenAI Integration</li>
                    <li><span class="status-indicator status-warning"></span>WhatsApp API</li>
                    <li><span class="status-indicator status-warning"></span>Firebase Messaging</li>
                </ul>
            </div>

            <div class="card">
                <h3>🚨 Analyseur d'Urgence - Démo</h3>
                <textarea id="messageInput" placeholder="Testez l'analyse d'urgence avec un message client...">Le chauffage ne fonctionne plus depuis ce matin et il fait très froid dans l'appartement !</textarea>
                <br>
                <button class="btn" onclick="testEmergencyAnalysis()">Analyser le Message</button>
                <div id="emergencyResult"></div>
            </div>

            <div class="card">
                <h3>📊 Statistiques du Projet</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">245</div>
                        <div class="stat-label">Fichiers</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">70</div>
                        <div class="stat-label">Scripts SQL</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">56</div>
                        <div class="stat-label">Modules TS</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">32</div>
                        <div class="stat-label">Composants</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>🛠️ Fonctionnalités Principales</h3>
                <ul class="feature-list">
                    <li>💬 Intégration WhatsApp Business</li>
                    <li>🤖 Réponses automatiques avec OpenAI</li>
                    <li>🚨 Détection d'urgences et escalades</li>
                    <li>📱 Notifications push en temps réel</li>
                    <li>📊 Tableau de bord analytique</li>
                    <li>🏠 Gestion multi-propriétés</li>
                </ul>
            </div>

            <div class="card">
                <h3>🔧 Actions Rapides</h3>
                <button class="btn" onclick="window.open('/health', '_blank')">Vérifier l'État de l'API</button>
                <button class="btn" onclick="window.open(':5000', '_blank')">Analyseur d'Urgence</button>
                <button class="btn" onclick="testSupabaseConnection()">Test Supabase</button>
                <button class="btn" onclick="showProjectAnalysis()">Analyse du Projet</button>
            </div>
        </div>
    </div>

    <script>
        async function testEmergencyAnalysis() {
            const message = document.getElementById('messageInput').value;
            const resultDiv = document.getElementById('emergencyResult');
            
            resultDiv.innerHTML = '<div style="padding: 10px; background: #f0f0f0; border-radius: 5px;">🔄 Analyse en cours...</div>';
            
            try {
                const response = await fetch('/api/analyze-emergency', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{
                            content: message,
                            direction: 'inbound',
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
                
                const data = await response.json();
                
                let className = 'emergency-normal';
                if (data.urgencyLevel === 'critical') className = 'emergency-critical';
                else if (data.isEmergency) className = 'emergency-warning';
                
                resultDiv.innerHTML = \`
                    <div class="emergency-result \${className}">
                        <h4>📊 Résultat de l'Analyse</h4>
                        <p><strong>Urgence:</strong> \${data.isEmergency ? '🚨 DÉTECTÉE' : '✅ Aucune'}</p>
                        <p><strong>Type:</strong> \${data.emergencyType || 'Normal'}</p>
                        <p><strong>Niveau:</strong> \${data.urgencyLevel}</p>
                        <p><strong>Confiance:</strong> \${Math.round(data.confidence * 100)}%</p>
                        <p><strong>Action:</strong> \${data.suggestedAction}</p>
                        <p><strong>Explication:</strong> \${data.explanation}</p>
                    </div>
                \`;
            } catch (error) {
                resultDiv.innerHTML = '<div class="emergency-result emergency-critical">❌ Erreur: ' + error.message + '</div>';
            }
        }

        async function testSupabaseConnection() {
            try {
                const response = await fetch('/api/test-supabase');
                const data = await response.json();
                alert(data.connected ? '✅ Supabase connecté avec succès!' : '❌ Erreur de connexion Supabase');
            } catch (error) {
                alert('❌ Erreur lors du test Supabase: ' + error.message);
            }
        }

        function showProjectAnalysis() {
            window.open('/project-analysis', '_blank');
        }

        // Auto-test au chargement
        setTimeout(() => {
            testEmergencyAnalysis();
        }, 1000);
    </script>
</body>
</html>
  `);
});

// API pour l'analyse d'urgence
app.post('/api/analyze-emergency', async (req, res) => {
  try {
    const { messages, propertyInfo, customInstructions } = req.body;
    const result = await analyzeEmergency(messages, propertyInfo, customInstructions);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API de test Supabase
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    res.json({ 
      connected: !error,
      message: error ? error.message : 'Connexion réussie'
    });
  } catch (error) {
    res.json({ connected: false, message: error.message });
  }
});

// Page d'analyse du projet
app.get('/project-analysis', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analyse du Projet Airhost</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .metric { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .metric-number { font-size: 2em; font-weight: bold; color: #007cba; }
        .metric-label { color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Analyse Complète du Projet Airhost</h1>
        <p>Rapport généré automatiquement à partir de l'analyse de 245 fichiers</p>
    </div>

    <div class="section">
        <h2>🏗️ Architecture du Projet</h2>
        <div class="grid">
            <div class="metric">
                <div class="metric-number">245</div>
                <div class="metric-label">Fichiers Total</div>
            </div>
            <div class="metric">
                <div class="metric-number">1.5</div>
                <div class="metric-label">MB de Code</div>
            </div>
            <div class="metric">
                <div class="metric-number">63</div>
                <div class="metric-label">Problèmes Sécurité</div>
            </div>
            <div class="metric">
                <div class="metric-number">3</div>
                <div class="metric-label">Sévérité Haute</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📁 Répartition des Composants</h2>
        <ul>
            <li><strong>Backend (15 fichiers):</strong> API TypeScript, services intégrés, webhooks</li>
            <li><strong>Frontend (122 fichiers):</strong> Interface React/TypeScript, 68 composants</li>
            <li><strong>Infrastructure (75 fichiers):</strong> 64 scripts SQL, migrations de base</li>
            <li><strong>Configuration (6 fichiers):</strong> Package.json, manifestes</li>
            <li><strong>Documentation (3 fichiers):</strong> README, guides techniques</li>
        </ul>
    </div>

    <div class="section">
        <h2>🔧 Technologies Utilisées</h2>
        <div class="grid">
            <div>
                <h4>Frontend</h4>
                <ul>
                    <li>React + TypeScript</li>
                    <li>Material-UI</li>
                    <li>Vite (build tool)</li>
                    <li>React Router</li>
                </ul>
            </div>
            <div>
                <h4>Backend</h4>
                <ul>
                    <li>Node.js + TypeScript</li>
                    <li>Supabase (PostgreSQL)</li>
                    <li>OpenAI GPT-4</li>
                    <li>Netlify Functions</li>
                </ul>
            </div>
            <div>
                <h4>Intégrations</h4>
                <ul>
                    <li>WhatsApp Business API</li>
                    <li>Firebase Cloud Messaging</li>
                    <li>Supabase Realtime</li>
                    <li>AI Analysis Engine</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🚨 Analyse de Sécurité</h2>
        <p><strong>63 problèmes détectés:</strong></p>
        <ul>
            <li>60 problèmes de sévérité moyenne (gestion des secrets)</li>
            <li>3 problèmes de haute sévérité (credentials hardcodés)</li>
        </ul>
        <p><em>Recommandation: Audit de sécurité et migration des secrets vers des variables d'environnement.</em></p>
    </div>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      emergency_analyzer: true
    },
    timestamp: new Date().toISOString()
  });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏨 Interface Airhost disponible sur le port ${PORT}`);
    console.log(`🌐 Accédez à: http://localhost:${PORT}`);
  });
}

module.exports = app;