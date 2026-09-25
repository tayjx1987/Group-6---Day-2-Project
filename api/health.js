/**
 * Standalone API health handler for MCP Server connection.
 * Reports whether MCP_SERVER_URL is configured, tools/list response status, and HTTP/RPC status code.
 * CRITICAL: Never prints secrets or authorization headers.
 */

import { MCP_TOOLS } from './mcp-engine.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = process.env.MCP_SERVER_URL?.trim();
  const mcpServerConfigured = Boolean(rawUrl && rawUrl.length > 0);
  const mcpAuthTokenConfigured = Boolean(process.env.MCP_AUTH_TOKEN?.trim());

  // Masked URL to prevent exposing any sensitive internal network tokens if in query
  let sanitizedUrl = null;
  if (mcpServerConfigured) {
    try {
      const parsed = new URL(rawUrl);
      sanitizedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      sanitizedUrl = 'custom_mcp_url';
    }
  }

  if (!mcpServerConfigured) {
    return res.status(200).json({
      status: 'healthy',
      mode: 'embedded_mcp_engine',
      mcpServerConfigured: false,
      mcpServerUrl: null,
      authTokenConfigured: mcpAuthTokenConfigured,
      toolsListSuccess: true,
      statusCode: 200,
      toolsAvailable: MCP_TOOLS.map((t) => t.name),
      message: 'Running in resilient standalone mode with embedded MCP JSON-RPC tool engine.',
      timestamp: new Date().toISOString(),
    });
  }

  // MCP_SERVER_URL is set: perform tools/list handshake
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (mcpAuthTokenConfigured) {
      headers['Authorization'] = `Bearer ${process.env.MCP_AUTH_TOKEN.trim()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const rpcRequest = {
      jsonrpc: '2.0',
      id: 'health-tools-list',
      method: 'tools/list',
      params: {},
    };

    const response = await fetch(rawUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(rpcRequest),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const httpStatusCode = response.status;
    let toolsListSuccess = false;
    let availableTools = [];

    if (response.ok) {
      const data = await response.json();
      if (data && !data.error) {
        toolsListSuccess = true;
        availableTools = data.result?.tools?.map((t) => t.name) || MCP_TOOLS.map((t) => t.name);
      }
    }

    return res.status(httpStatusCode < 400 ? 200 : 502).json({
      status: toolsListSuccess ? 'connected' : 'degraded',
      mode: 'remote_mcp_server',
      mcpServerConfigured: true,
      mcpServerUrl: sanitizedUrl,
      authTokenConfigured: mcpAuthTokenConfigured,
      toolsListSuccess,
      statusCode: httpStatusCode,
      toolsAvailable: availableTools,
      message: toolsListSuccess
        ? 'Successfully connected to external MCP Server and verified tools/list.'
        : `MCP Server responded with HTTP ${httpStatusCode} or error during tools/list.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unreachable',
      mode: 'remote_mcp_server',
      mcpServerConfigured: true,
      mcpServerUrl: sanitizedUrl,
      authTokenConfigured: mcpAuthTokenConfigured,
      toolsListSuccess: false,
      statusCode: 503,
      toolsAvailable: MCP_TOOLS.map((t) => t.name),
      message: `Failed to reach configured MCP Server (${err.name === 'AbortError' ? 'timeout' : 'connection refused'}). Falling back to embedded tool engine.`,
      timestamp: new Date().toISOString(),
    });
  }
}
