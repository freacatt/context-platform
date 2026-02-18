
export const PACKAGE_JSON = JSON.stringify({
  "name": "local-mcp-server",
  "version": "1.0.0",
  "description": "Local MCP server for exported workspace context",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "tsx": "^4.7.2",
    "typescript": "^5.4.5"
  }
}, null, 2);

export const TSCONFIG_JSON = JSON.stringify({
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}, null, 2);

export const SERVER_INDEX_TS = `
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3333;
const MAX_CONTEXT_CHARS = parseInt(process.env.MAX_CONTEXT_CHARS || '20000', 10);
const DATA_PATH = path.join(__dirname, '../../data/workspace.json');

// Types
interface WorkspaceData {
  workspaceId: string;
  workspaceName: string;
  exportedAt: string;
  globalContext: string; // The aggregated context string
  documents: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
  }>;
}

// Load Data
let workspaceData: WorkspaceData;

try {
  console.log(\`Loading data from \${DATA_PATH}...\`);
  if (!fs.existsSync(DATA_PATH)) {
    console.error(\`Error: Data file not found at \${DATA_PATH}\`);
    process.exit(1);
  }
  const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
  workspaceData = JSON.parse(rawData);
  console.log(\`Loaded workspace: "\${workspaceData.workspaceName}" (ID: \${workspaceData.workspaceId})\`);
  console.log(\`Global Context Length: \${workspaceData.globalContext.length} chars\`);
  console.log(\`Documents: \${workspaceData.documents ? workspaceData.documents.length : 0}\`);
} catch (error) {
  console.error("Failed to load workspace data:", error);
  process.exit(1);
}

// Setup Express & MCP
const app = express();
app.use(cors());
// Note: We do NOT use express.json() here because SSEServerTransport.handlePostMessage
// expects the raw request stream to be readable. If express.json() reads it first,
// the stream will be consumed and handlePostMessage will fail.

const server = new Server({
  name: \`local-mcp-\${workspaceData.workspaceName.replace(/\\s+/g, '-').toLowerCase()}\`,
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Tools Implementation
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_global_context",
        description: "Retrieve the global context for the workspace. Use this to understand the project background, rules, and architecture.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search_context",
        description: "Search within the global context and available documents.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query string",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_document",
        description: "Retrieve the full content of a specific document by ID.",
        inputSchema: {
          type: "object",
          properties: {
            docId: {
              type: "string",
              description: "The ID of the document to retrieve",
            },
          },
          required: ["docId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_global_context": {
      const context = workspaceData.globalContext || "";
      const trimmed = context.length > MAX_CONTEXT_CHARS 
        ? context.substring(0, MAX_CONTEXT_CHARS) + "\\n...[Truncated]" 
        : context;
      
      return {
        content: [
          {
            type: "text",
            text: trimmed,
          },
        ],
      };
    }

    case "search_context": {
      const query = String(request.params.arguments?.query || "").toLowerCase();
      if (!query) {
        throw new McpError(ErrorCode.InvalidParams, "Query is required");
      }

      const results: string[] = [];
      
      // Search in Global Context
      if (workspaceData.globalContext && workspaceData.globalContext.toLowerCase().includes(query)) {
        results.push("Match found in Global Context (use get_global_context to view)");
      }

      // Search in Documents
      if (workspaceData.documents) {
        workspaceData.documents.forEach(doc => {
          if (
            (doc.title && doc.title.toLowerCase().includes(query)) || 
            (doc.content && doc.content.toLowerCase().includes(query))
          ) {
            results.push(\`Document found: "\${doc.title}" (ID: \${doc.id})\`);
          }
        });
      }

      return {
        content: [
          {
            type: "text",
            text: results.length > 0 
              ? \`Found \${results.length} matches:\\n- \${results.join('\\n- ')}\`
              : "No matches found.",
          },
        ],
      };
    }

    case "get_document": {
      const docId = String(request.params.arguments?.docId || "");
      if (!docId) {
        throw new McpError(ErrorCode.InvalidParams, "docId is required");
      }

      const doc = workspaceData.documents?.find(d => d.id === docId);
      if (!doc) {
        return {
          content: [
            {
              type: "text",
              text: \`Document with ID "\${docId}" not found.\`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: \`### \${doc.title}\\n\\n\${doc.content}\`,
          },
        ],
      };
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, "Unknown tool");
  }
});

// SSE Endpoints
// Since SSEServerTransport needs to be shared between GET /sse and POST /message, 
// we need to manage it.
let transport: SSEServerTransport | null = null;

app.get('/sse', async (req, res) => {
  console.log('New SSE connection');
  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No active connection');
  }
});


app.listen(PORT, () => {
  console.log(\`Local MCP Server running on port \${PORT}\`);
  console.log(\`SSE Endpoint: http://localhost:\${PORT}/sse\`);
});
`;

export const SERVER_README_MD = `
# Local MCP Server

This is a standalone Model Context Protocol (MCP) server that serves your exported workspace data.

## Prerequisites

- Node.js (v18 or higher)
- npm

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

## Running the Server

1. Start the server:
   \`\`\`bash
   npm run dev
   \`\`\`

2. The server will start on port 3333 (default).
   - SSE Endpoint: \`http://localhost:3333/sse\`

## connecting to AI Clients

### Claude Desktop

Add the following to your \`claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "my-local-workspace": {
      "command": "node",
      "args": ["path/to/server/dist/index.js"],
      "env": {}
    }
  }
}
\`\`\`

*Note: If you want to use the SSE endpoint instead of spawning the process directly:*

\`\`\`json
{
  "mcpServers": {
    "my-local-workspace": {
      "url": "http://localhost:3333/sse"
    }
  }
}
\`\`\`
`;

export const ROOT_README_MD = `
# Exported Workspace Context

This folder contains a snapshot of your workspace context and a local MCP server to serve it to AI agents.

## Contents

- \`data/workspace.json\`: The exported data (Global Context + Documents).
- \`server/\`: A runnable Node.js MCP server.

## Quick Start

1. Open a terminal in the \`server/\` directory.
2. Run \`npm install\`.
3. Run \`npm run dev\`.
4. Connect your AI client (e.g., Claude Desktop, Cursor) to \`http://localhost:3333/sse\`.

See \`server/README.md\` for more details.
`;
