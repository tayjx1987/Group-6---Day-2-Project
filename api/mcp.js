/**
 * Vercel Serverless Function fallback for /api/mcp
 * Handles SSE streams and JSON-RPC 2.0 tool requests
 */

import { MCP_TOOLS, executeLocalMcpTool } from './mcp-engine.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: SSE Stream
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    res.write(`event: endpoint\ndata: ${JSON.stringify({ uri: '/api/mcp', protocol: 'mcp-2024-11-05', ready: true })}\n\n`);
    res.write(`event: ping\ndata: ${JSON.stringify({ timestamp: new Date().toISOString(), initial: true })}\n\n`);

    const interval = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
      } catch (e) {
        clearInterval(interval);
      }
    }, 5000);

    req.on('close', () => {
      clearInterval(interval);
    });
    return;
  }

  // POST: JSON-RPC 2.0
  if (req.method === 'POST') {
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
        result: { tools: MCP_TOOLS },
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
            content: [{ type: 'text', text: JSON.stringify(toolResult) }],
            structuredData: toolResult,
          },
        });
      } catch (err) {
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
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
