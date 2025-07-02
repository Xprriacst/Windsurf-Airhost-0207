const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 5000;

// Middleware pour servir les fichiers statiques
app.use(express.static('dist'));
app.use(express.json());

// Configuration CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Route pour servir l'application React
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Si le build n'existe pas, on sert le fichier source directement
    const srcIndexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(srcIndexPath)) {
      res.sendFile(srcIndexPath);
    } else {
      res.status(404).send('Interface Airhost non trouvée');
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Interface Airhost originale démarrée sur le port ${PORT}`);
  console.log(`Accès: http://localhost:${PORT}`);
});