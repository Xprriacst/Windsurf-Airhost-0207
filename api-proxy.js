import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3001;

// Proxy pour rediriger les appels API vers le service Python
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8080',
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Service temporairement indisponible' });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:8080${req.url}`);
  }
}));

app.listen(PORT, () => {
  console.log(`Proxy API démarré sur le port ${PORT}`);
});