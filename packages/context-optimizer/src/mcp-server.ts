import * as readline from 'node:readline';
import { ContextOptimizer } from './optimizer.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export function runMcpServer(): void {
  const optimizer = new ContextOptimizer();

  if (process.argv.includes('--stats-json')) {
    process.stdout.write(JSON.stringify(optimizer.getStats(), null, 2) + '\n');
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  function sendResponse(response: JsonRpcResponse): void {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let req: JsonRpcRequest;
    try {
      req = JSON.parse(trimmed);
    } catch {
      sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      });
      return;
    }

    const id = req.id ?? null;

    if (req.method === 'initialize') {
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'code-conductor-context-optimizer',
            version: '0.1.0',
          },
        },
      });
      return;
    }

    if (req.method === 'notifications/initialized') {
      return;
    }

    if (req.method === 'tools/list') {
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'compress_context',
              description: 'Optimize context payload and cache original for optional retrieval',
              inputSchema: {
                type: 'object',
                properties: {
                  content: { type: 'string', description: 'Raw content to optimize' },
                  content_type: { type: 'string', description: 'Content type or extension (e.g. json, yaml, tf, md)' },
                  project: { type: 'string', description: 'Client project (codex, claude, copilot, antigravity, vscode)' },
                },
                required: ['content'],
              },
            },
            {
              name: 'read_compressed_file',
              description: 'Read a local file and return it formatted in an ephemeral context block',
              inputSchema: {
                type: 'object',
                properties: {
                  filepath: { type: 'string', description: 'Path to file on disk' },
                  project: { type: 'string', description: 'Client project name' },
                },
                required: ['filepath'],
              },
            },
            {
              name: 'retrieve_context',
              description: 'Retrieve an original, unoptimized payload by context id',
              inputSchema: {
                type: 'object',
                properties: {
                  context_id: { type: 'string', description: 'The UUID returned by compress_context' },
                },
                required: ['context_id'],
              },
            },
            {
              name: 'optimization_stats',
              description: 'Return session optimization metrics for dashboards and diagnostics',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
          ],
        },
      });
      return;
    }

    if (req.method === 'tools/call') {
      const params = req.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
      const toolName = params?.name;
      const args = params?.arguments ?? {};

      try {
        if (toolName === 'compress_context') {
          const content = String(args.content ?? '');
          const contentType = args.content_type ? String(args.content_type) : 'text';
          const project = args.project ? String(args.project) : 'vscode';
          const result = optimizer.compress(content, { contentType, project });
          const text = [
            `context_id=${result.contextId}`,
            `tokens_saved=${result.tokensSaved}`,
            '<context_block cache_control="ephemeral">',
            result.optimizedContent,
            '</context_block>',
          ].join('\n');
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text }],
            },
          });
          return;
        }

        if (toolName === 'read_compressed_file') {
          const filepath = String(args.filepath ?? '');
          const project = args.project ? String(args.project) : 'vscode';
          const { content } = optimizer.readCompressedFile(filepath, project);
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: content }],
            },
          });
          return;
        }

        if (toolName === 'retrieve_context') {
          const contextId = String(args.context_id ?? '');
          const original = optimizer.retrieve(contextId);
          if (original === undefined) {
            sendResponse({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: 'Error: Context id not found or expired.' }],
                isError: true,
              },
            });
            return;
          }
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: original }],
            },
          });
          return;
        }

        if (toolName === 'optimization_stats') {
          const stats = optimizer.getStats();
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
            },
          });
          return;
        }

        sendResponse({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Tool not found: ${toolName}` },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
          },
        });
      }
      return;
    }

    sendResponse({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${req.method}` },
    });
  });
}
