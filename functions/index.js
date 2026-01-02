import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "product-platform-c9bb9"
  });
}
const db = admin.firestore();

// Configure Global Options (Gen 2)
setGlobalOptions({ region: "us-central1" });

const app = express();
app.use(cors({ origin: true }));

// Store active transports/servers in memory
const sessions = new Map();

app.get("/mcp/sse", async (req, res) => {
  console.log("New SSE connection");
  
  const server = new Server(
    {
      name: "pyramid-solver-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  setupTools(server);

  const transport = new SSEServerTransport("/mcp/messages", res);
  
  await server.connect(transport);

  if (transport.sessionId) {
    sessions.set(transport.sessionId, transport);
  }

  req.on("close", () => {
    console.log("SSE connection closed");
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
    }
    server.close();
  });
});

app.post("/mcp/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    res.status(400).send("Missing sessionId");
    return;
  }

  const transport = sessions.get(sessionId);
  if (!transport) {
    res.status(404).send("Session not found or expired");
    return;
  }

  // Pass the message to the transport
  await transport.handlePostMessage(req, res);
});

// Helper to register tools
function setupTools(server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_app_context",
          description: "Get the app's tech stack and database schema",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "list_pyramids",
          description: "List recent pyramids",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number" },
              userId: { type: "string" }
            },
          },
        },
        {
          name: "get_pyramid",
          description: "Get full pyramid details",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string" }
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

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        
        if (name === "get_app_context") {
            return {
                content: [{
                    type: "text",
                    text: `App Context: Pyramid Solver
Stack: React, Vite, Firebase (Auth, Firestore, Functions)

Firestore Rules (Schema):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(userId) { return request.auth != null && request.auth.uid == userId; }
    match /users/{userId} { allow read, write: if isOwner(userId); }
    match /pyramids/{pyramidId} {
      allow create: if isOwner(request.resource.data.userId);
      allow read, update, delete: if isOwner(resource.data.userId);
    }
    match /productDefinitions/{definitionId} {
      allow create: if isOwner(request.resource.data.userId);
      allow read, update, delete: if isOwner(resource.data.userId);
    }
    match /contextDocuments/{documentId} {
      allow create: if isOwner(request.resource.data.userId);
      allow read, update, delete: if isOwner(resource.data.userId);
    }
  }
}`
                }]
            };
        }

        if (name === "list_pyramids") {
            const limit = Number(args?.limit) || 10;
            let query = db.collection("pyramids").orderBy("lastModified", "desc").limit(limit);
            if (args?.userId) query = query.where("userId", "==", args.userId);
            
            const snapshot = await query.get();
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title,
                status: doc.data().status
            }));
            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }

        if (name === "get_pyramid") {
            const id = String(args?.id);
            const doc = await db.collection("pyramids").doc(id).get();
            if (!doc.exists) throw new McpError(ErrorCode.InvalidParams, "Pyramid not found");
            return { content: [{ type: "text", text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2) }] };
        }

        if (name === "list_product_definitions") {
            const limit = Number(args?.limit) || 10;
            const snapshot = await db.collection("productDefinitions").orderBy("lastModified", "desc").limit(limit).get();
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title
            }));
            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }
  
        if (name === "get_product_definition") {
            const id = String(args?.id);
            const doc = await db.collection("productDefinitions").doc(id).get();
            if (!doc.exists) throw new Error("Document not found");
            return { content: [{ type: "text", text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2) }] };
        }

        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
    } catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
  });
}

// Expose the Express app as a Cloud Function
export const mcpServer = onRequest({
    timeoutSeconds: 300, // Long timeout for SSE
    cors: true
}, app);
