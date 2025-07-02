#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 5000;

// Configuration CORS
app.use(cors());

// Proxy pour le webhook WhatsApp vers le port 3001
const webhookProxy = createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  logLevel: 'debug',
  timeout: 30000,
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    console.error('Erreur de proxy webhook:', err.message);
    console.error('URL demandée:', req.url);
    console.error('Méthode:', req.method);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Service webhook temporairement indisponible',
        details: err.message,
        timestamp: new Date().toISOString()
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] Response ${proxyRes.statusCode} for ${req.url}`);
  }
});

app.use('/webhook', webhookProxy);

// Route de test pour vérifier que le proxy fonctionne
app.get('/test-webhook', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Proxy webhook WhatsApp fonctionnel',
    webhook_url: `${req.protocol}://${req.get('host')}/webhook/whatsapp`,
    verify_token: 'airhost_webhook_verify_2024'
  });
});

// Route racine pour l'app principale
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Servir les fichiers statiques
app.use(express.static('.'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur principal avec proxy webhook démarré sur le port ${PORT}`);
  console.log(`📱 URL webhook WhatsApp: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`🔑 Token de vérification: airhost_webhook_verify_2024`);
});