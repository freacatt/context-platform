#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import admin from "firebase-admin";
import fs from "fs/promises";
import { appendFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- DEBUG LOGGING ---
// Since this runs over stdio, console.log breaks the protocol.
// We log to a file for debugging.
const LOG_FILE = path.resolve("/tmp/pyramid-mcp-debug.log");

function log(message: string) {
  try {
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch (e) {
    // ignore logging errors
  }
}

log("Starting MCP Server...");
log(`Current Working Directory: ${process.cwd()}`);
log(`Environment Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

// 1. Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    // Check if credential file exists if env var is set
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
            // Synchronously check to fail early
            const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            log(`Checking credential file at: ${credPath}`);
            // We don't read it here, just letting admin SDK handle it, 
            // but logging the attempt is helpful.
        } catch (e) {
            log(`Warning: Could not check credential file: ${e}`);
        }
    }

    admin.initializeApp({
        projectId: "product-platform-c9bb9"
    });
    log("Firebase Admin Initialized successfully.");
  }
} catch (error: any) {
  log(`CRITICAL ERROR: Failed to initialize Firebase Admin: ${error.message}`);
  log(`Stack: ${error.stack}`);
  // We exit because the server is useless without DB access
  process.exit(1);
}

const db = admin.firestore();

// 2. Setup MCP Server
const server = new Server(
  {
    name: "pyramid-solver-local",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 3. Define Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  log("Received request: list_tools");
  return {
    tools: [
      {
        name: "get_schema",
        description: "Get the Firestore security rules to understand the database schema",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_pyramids",
        description: "List recent Pyramids created in the app",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max number of results (default 10)" },
            userId: { type: "string", description: "Filter by User ID" }
          },
        },
      },
      {
        name: "get_pyramid",
        description: "Get full details of a specific Pyramid, including all blocks",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The Pyramid ID" }
          },
          required: ["id"],
        },
      },
      {
        name: "list_product_definitions",
        description: "List Product Definitions",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max number of results (default 10)" }
          },
        },
      },
      {
        name: "get_product_definition",
        description: "Get full details of a Product Definition",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The Definition ID" }
          },
          required: ["id"],
        },
      }
    ],
  };
});

// 4. Implement Tool Logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  log(`Received tool call: ${name} with args: ${JSON.stringify(args)}`);

  try {
    if (name === "get_schema") {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const rulesPath = path.resolve(__dirname, "../../firestore.rules");
        log(`Reading rules from: ${rulesPath}`);
        const rules = await fs.readFile(rulesPath, "utf-8");
        return { content: [{ type: "text", text: rules }] };
    }

    if (name === "list_pyramids") {
      const limit = Number(args?.limit) || 10;
      let query = db.collection("pyramids").orderBy("lastModified", "desc").limit(limit);
      
      if (args?.userId) {
        query = query.where("userId", "==", args.userId);
      }

      const snapshot = await query.get();
      log(`Found ${snapshot.size} pyramids`);
      
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        status: doc.data().status,
        lastModified: doc.data().lastModified?.toDate()?.toISOString()
      }));

      return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
    }

    if (name === "get_pyramid") {
      const id = String(args?.id);
      const doc = await db.collection("pyramids").doc(id).get();
      
      if (!doc.exists) throw new Error("Pyramid not found");
      
      return { content: [{ type: "text", text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2) }] };
    }

    if (name === "list_product_definitions") {
      const limit = Number(args?.limit) || 10;
      const snapshot = await db.collection("productDefinitions").orderBy("lastModified", "desc").limit(limit).get();
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        lastModified: doc.data().lastModified?.toDate()?.toISOString()
      }));

      return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
    }

    if (name === "get_product_definition") {
      const id = String(args?.id);
      const doc = await db.collection("productDefinitions").doc(id).get();
      
      if (!doc.exists) throw new Error("Document not found");
      
      return { content: [{ type: "text", text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2) }] };
    }

    throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
  } catch (error: any) {
    log(`Error in tool ${name}: ${error.message}`);
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
log("Server connected and ready.");
