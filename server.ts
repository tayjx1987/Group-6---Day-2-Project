import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import stockHandler from './api/stock.js';
import healthHandler from './api/health.js';
import { MCP_TOOLS, executeLocalMcpTool } from './api/mcp-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Mount shared backend API routes
  app.get('/api/stock', (req, res) => {
    return stockHandler(req, res);
  });

  app.get('/api/health', (req, res) => {
    return healthHandler(req, res);
  });

  // MCP SSE Stream & connection endpoint at /api/mcp
  app.get('/api/mcp', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    // Announce MCP session initiation
    res.write(`event: endpoint\ndata: ${JSON.stringify({ uri: '/api/mcp', protocol: 'mcp-2024-11-05', ready: true })}\n\n`);

    const interval = setInterval(() => {
      res.write(`event: ping\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // MCP JSON-RPC 2.0 tool execution endpoint
  app.post('/api/mcp', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const { jsonrpc, id, method, params } = req.body || {};

    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
      });
    }

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    if (method === 'tools/call' || method === 'callTool') {
      const toolName = params?.name || params?.tool;
      const toolArgs = params?.arguments || params?.args || {};

      try {
        const toolResult = executeLocalMcpTool(toolName, toolArgs);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolResult),
              },
            ],
            structuredData: toolResult,
          },
        });
      } catch (err: any) {
        return res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: err.message || 'Execution error' },
        });
      }
    }

    if (method === 'ping') {
      return res.json({ jsonrpc: '2.0', id, result: { pong: true } });
    }

    return res.status(404).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method '${method}' not found` },
    });
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
    console.log(`[Server] MANNAG MCP Stock Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
