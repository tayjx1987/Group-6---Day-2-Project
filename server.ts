import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import stockHandler from './api/stock.js';
import healthHandler from './api/health.js';
import mcpHandler from './api/mcp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Mount MCP Streamable HTTP endpoint for both POST and GET
  app.post('/api/mcp', mcpHandler);
  app.get('/api/mcp', mcpHandler);

  // Mount shared backend API routes
  app.get('/api/stock', (req, res) => {
    return stockHandler(req, res);
  });

  app.get('/api/health', (req, res) => {
    return healthHandler(req, res);
  });

  // Handle client Vite app
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] MANNAG App and MCP Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
