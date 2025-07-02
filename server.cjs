const express = require('express');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('.'));

// Servir l'interface principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'airhost-dashboard.html'));
});

// API pour l'analyse d'urgence avec OpenAI
app.post('/api/analyze-emergency', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages requis' });
    }

    // Vérifier si OpenAI est disponible
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'Clé API OpenAI non configurée',
        fallback: true 
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const systemPrompt = `Analyse ce message client pour détecter les urgences. Réponds en JSON:
{
  "isEmergency": boolean,
  "emergencyType": string | null,
  "confidence": number,
  "urgencyLevel": "low" | "medium" | "high" | "critical",
  "explanation": string,
  "suggestedAction": string
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messages[messages.length - 1].content }
      ],
      temperature: 0.2,
      max_tokens: 500
    });

    const analysisText = response.choices[0].message.content;
    const analysis = JSON.parse(analysisText);
    
    res.json(analysis);

  } catch (error) {
    console.error('Erreur analyse:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'analyse',
      details: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString()
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Interface Airhost disponible sur le port ${PORT}`);
  console.log(`Accédez à: http://localhost:${PORT}`);
});