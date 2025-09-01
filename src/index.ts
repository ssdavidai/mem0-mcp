#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryClient } from 'mem0ai';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Configuration schema for Smithery
export const configSchema = z.object({
  apiKey: z.string().describe("Mem0 API key"),
  userId: z.string().default('mem0-mcp-user').describe("Default user ID for memory storage"),
});

// Tool definitions
const ADD_MEMORY_TOOL: Tool = {
  name: 'add-memory',
  description:
    'Add a new memory. This method is called everytime the user informs anything about themselves, their preferences, or anything that has any relevent information whcih can be useful in the future conversation. This can also be called when the user asks you to remember something.',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The content to store in memory',
      },
      userId: {
        type: 'string',
        description:
          "User ID for memory storage. If not provided explicitly, use a generic user ID like, 'mem0-mcp-user'",
      },
    },
    required: ['content', 'userId'],
  },
};

const SEARCH_MEMORIES_TOOL: Tool = {
  name: 'search-memories',
  description:
    'Search through stored memories. This method is called ANYTIME the user asks anything.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          "The search query. This is the query that the user has asked for. Example: 'What did I tell you about the weather last week?' or 'What did I tell you about my friend John?'",
      },
      userId: {
        type: 'string',
        description:
          "User ID for memory storage. If not provided explicitly, use a generic user ID like, 'mem0-mcp-user'",
      },
      returnAll: {
        type: 'boolean',
        description:
          "If true, returns all matching memories with scores. If false (default), returns only the most relevant memory.",
      },
    },
    required: ['query', 'userId'],
  },
};

// ---------- Helpers ----------
function normalizeOneLine(s: string): string {
  // collapse CR/LF/Tabs + multiple spaces → single space
  return (s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function round(n: any, p = 3): number | any {
  const num = Number(n);
  return Number.isFinite(num) ? Number(num.toFixed(p)) : n;
}
function truncate(s: string, max = 3500): string {
  if (!s) return s;
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Export default createServer function for Smithery
export default function createServer({ config }: { config: z.infer<typeof configSchema> }) {
  // Initialize mem0ai client with provided API key
  const memoryClient = new MemoryClient({ apiKey: config.apiKey });
  const defaultUserId = config.userId || 'mem0-mcp-user';

  // Create server instance
  const server = new Server(
    {
      name: 'mem0-mcp',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  // Helper function to add memories
  async function addMemory(content: string, userId: string) {
    try {
      const messages = [
        { role: 'system', content: 'Memory storage system' },
        { role: 'user', content },
      ];
      await memoryClient.add(messages, { user_id: userId || defaultUserId });
      return true;
    } catch (error) {
      console.error('Error adding memory:', error);
      return false;
    }
  }

  // Helper function to search memories
  async function searchMemories(query: string, userId: string) {
    try {
      const results = await memoryClient.search(query, { user_id: userId || defaultUserId });
      return results;
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [ADD_MEMORY_TOOL, SEARCH_MEMORIES_TOOL],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('No arguments provided');
      }

      switch (name) {
        case 'add-memory': {
          const { content, userId } = args as { content: string; userId: string };
          await addMemory(content, userId);
          return {
            content: [
              {
                type: 'text',
                text: 'Memory added successfully',
              },
            ],
            isError: false,
          };
        }

        case 'search-memories': {
          const { query, userId, returnAll } = args as { query: string; userId: string; returnAll?: boolean };
          const results = await searchMemories(query, userId);

          // For VAPI compatibility, return a clearer, more direct response
          if (!Array.isArray(results) || results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No memories found',
                },
              ],
              isError: false,
            };
          }

          // If returnAll is true, return all memories with scores
          if (returnAll) {
            const formatted = results
              .slice(0, 5)
              .map((r: any) => {
                const mem = normalizeOneLine(String(r?.memory ?? ''));
                const score = round(r?.score ?? 0);
                return `${mem} (relevance: ${score})`;
              })
              .join('; ');

            return {
              content: [
                {
                  type: 'text',
                  text: formatted || 'No memories found',
                },
              ],
              isError: false,
            };
          }

          // Default: Get the most relevant memory (highest score)
          const topResult = results[0];
          const memory = normalizeOneLine(String(topResult?.memory ?? ''));
          
          // Return just the most relevant memory in a clear format
          // This makes it easier for VAPI to parse and use
          const response = memory || 'No relevant memory found';

          return {
            content: [
              {
                type: 'text',
                text: response, // Return just the memory content, no scores or formatting
              },
            ],
            isError: false,
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Return the MCP server object for Smithery
  return server;
}

// Function to log safely
function safeLog(
  level:
    | 'error'
    | 'debug'
    | 'info'
    | 'notice'
    | 'warning'
    | 'critical'
    | 'alert'
    | 'emergency',
  data: any,
  server: Server
): void {
  // For stdio transport, log to stderr to avoid protocol interference
  console.error(
    `[${level}] ${typeof data === 'object' ? JSON.stringify(data) : data}`
  );

  // Send to logging capability if available
  try {
    server.sendLoggingMessage({ level, data });
  } catch (error) {
    // Ignore errors when logging is not available
  }
}

// Main function for standalone execution (not needed for Smithery but kept for backward compatibility)
async function main() {
  try {
    // Get API key from environment for standalone mode
    const MEM0_API_KEY = process?.env?.MEM0_API_KEY || '';
    
    if (!MEM0_API_KEY) {
      console.error('Error: MEM0_API_KEY environment variable is required');
      process.exit(1);
    }

    console.error('Initializing Mem0 Memory MCP Server...');

    // Create server with environment config
    const server = createServer({ 
      config: { 
        apiKey: MEM0_API_KEY, 
        userId: 'mem0-mcp-user' 
      } 
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    safeLog('info', 'Mem0 Memory MCP Server initialized successfully', server);
    console.error('Memory MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal error running server:', error);
    process.exit(1);
  }
}

// Only run main if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}