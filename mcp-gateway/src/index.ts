import "dotenv/config";
import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { authMiddleware } from "./auth.js";
import { fetchAggregatedContext } from "./tools/context.js";
import { searchResources, readResource } from "./tools/resources.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Map session ID to transport
const sessions = new Map<string, SSEServerTransport>();

app.get("/mcp", authMiddleware, async (req, res) => {
  const workspaceId = (req as any).workspaceId;
  const settings = (req as any).mcpSettings;

  console.log(`New connection for workspace ${workspaceId}`);

  const server = new Server({
    name: "Pyramid Solver Workspace",
    version: "1.0.0",
  }, {
    capabilities: {
      tools: {},
    },
  });

  // Handle ListTools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: any[] = [];

    // Tool: read_global_context
    if (settings.allowedTools.includes("read_global_context")) {
      tools.push({
        name: "read_global_context",
        description: "Reads the aggregated global context of the workspace. Use this to understand the project architecture, product definitions, and current context.",
        inputSchema: {
          type: "object",
          properties: {},
        }
      });
    }

    // Tool: search_resources
    if (settings.allowedTools.includes("search_resources") && settings.exposeDocuments) {
      tools.push({
        name: "search_resources",
        description: "Search for specific documents or resources in the workspace.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query string" }
          },
          required: ["query"]
        }
      });
    }

    // Tool: read_resource
    if (settings.allowedTools.includes("read_resource") && settings.exposeDocuments) {
      tools.push({
        name: "read_resource",
        description: "Read the full content of a specific resource.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The ID of the resource" },
            type: { type: "string", description: "The type of the resource (pyramid, productDefinition, contextDocument, etc.)" }
          },
          required: ["id", "type"]
        }
      });
    }

    return { tools };
  });

  // Handle CallTool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "read_global_context") {
       if (!settings.allowedTools.includes("read_global_context")) {
         throw new McpError(ErrorCode.InvalidRequest, "Tool disabled");
       }
       try {
        const context = await fetchAggregatedContext(workspaceId);
        const limit = settings.maxContextSize || 10000;
        const truncated = context.length > limit ? context.slice(0, limit) + "...(truncated)" : context;
        return {
          content: [{ type: "text", text: truncated }],
        };
       } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error: ${e.message}` }],
          isError: true
        };
       }
    }

    if (name === "search_resources") {
       if (!settings.allowedTools.includes("search_resources") || !settings.exposeDocuments) {
         throw new McpError(ErrorCode.InvalidRequest, "Tool disabled");
       }
       const query = String(args?.query || "");
       try {
         const results = await searchResources(workspaceId, query);
         return {
           content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
         };
       } catch (e: any) {
         return {
           content: [{ type: "text", text: `Error: ${e.message}` }],
           isError: true
         };
       }
    }

    if (name === "read_resource") {
       if (!settings.allowedTools.includes("read_resource") || !settings.exposeDocuments) {
         throw new McpError(ErrorCode.InvalidRequest, "Tool disabled");
       }
       const id = String(args?.id || "");
       const type = String(args?.type || "");
       try {
         const content = await readResource(workspaceId, id, type);
         if (!content) {
            return {
              content: [{ type: "text", text: "Resource not found or access denied." }],
              isError: true
            };
         }
         return {
           content: [{ type: "text", text: content }]
         };
       } catch (e: any) {
         return {
           content: [{ type: "text", text: `Error: ${e.message}` }],
           isError: true
         };
       }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
  });

  const transport = new SSEServerTransport("/messages", res);
  sessions.set(transport.sessionId, transport);

  res.on("close", () => {
    console.log(`Connection closed for session ${transport.sessionId}`);
    sessions.delete(transport.sessionId);
    server.close();
  });

  await server.connect(transport);
});

app.post("/messages", authMiddleware, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessions.get(sessionId);
  
  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }
  
  await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
  console.log(`MCP Gateway running on port ${PORT}`);
});
