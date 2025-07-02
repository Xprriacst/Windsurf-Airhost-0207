const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware pour parser JSON
app.use(express.json());

// Configuration CORS complète
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

// Servir les fichiers statiques de src
app.use('/src', express.static(path.join(__dirname, 'src')));

// Servir node_modules pour les dépendances
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Route principale pour servir l'interface React
app.get('/', (req, res) => {
  const indexHtml = `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Airhost - Interface Originale</title>
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
          sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import React from '/node_modules/react/index.js';
      import ReactDOM from '/node_modules/react-dom/client.js';
      import App from '/src/App.tsx';
      import '/src/index.css';

      ReactDOM.createRoot(document.getElementById('root')).render(
        React.createElement(React.StrictMode, null,
          React.createElement(App)
        )
      );
    </script>
  </body>
</html>`;
  
  res.send(indexHtml);
});

// Servir les assets et autres fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route catch-all pour React Router
app.get('*', (req, res) => {
  // Pour toutes les autres routes, rediriger vers l'index
  res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Interface Airhost originale sur le port ${PORT}`);
  console.log(`Architecture React complète accessible`);
  console.log(`Pages: Login, Chat, Properties, Settings, Debug, ChatSandbox`);
});