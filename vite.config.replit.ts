import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration spécifique pour Replit
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'whatsapp-webhook',
      configureServer(server) {
        server.middlewares.use('/webhook/whatsapp', (req, res, next) => {
          if (req.method === 'GET') {
            // Vérification webhook WhatsApp
            const url = new URL(req.url, `http://${req.headers.host}`)
            const mode = url.searchParams.get('hub.mode')
            const token = url.searchParams.get('hub.verify_token')
            const challenge = url.searchParams.get('hub.challenge')
            
            console.log(`Vérification webhook WhatsApp: mode=${mode}, token=${token ? 'présent' : 'absent'}`)
            
            if (mode === 'subscribe' && token === 'airhost_webhook_verify_2024' && challenge) {
              console.log('Webhook WhatsApp vérifié avec succès')
              res.setHeader('Content-Type', 'text/plain')
              res.statusCode = 200
              res.end(challenge)
              return
            } else {
              console.error('Échec de la vérification du webhook WhatsApp - token incorrect')
              res.statusCode = 403
              res.end('Forbidden')
              return
            }
          } else if (req.method === 'POST') {
            // Rediriger vers le serveur webhook
            next()
          } else {
            res.statusCode = 405
            res.end('Method Not Allowed')
          }
        })
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 5000,
    hmr: {
      port: 5000,
      host: 'localhost'
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.replit.dev',
      '.worf.replit.dev',
      '*.replit.dev',
      '*.worf.replit.dev',
      '.replit.app',
      '*.replit.app'
    ],
    proxy: {
      '/api/analyze-emergency': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        onError: (err, req, res) => {
          console.error('Proxy error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Service temporairement indisponible' }));
        }
      },
      '/webhook/whatsapp': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api/openai-proxy': {
        target: 'https://api.openai.com/v1/chat/completions',
        changeOrigin: true,
        rewrite: (path) => '',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.body) {
              const bodyData = JSON.stringify(req.body);
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Authorization', `Bearer ${process.env.OPENAI_API_KEY}`);
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          });
        }
      }
    }
  },
  define: {
    global: 'globalThis',
  },
  envPrefix: 'VITE_'
})