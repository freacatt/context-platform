import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const EventSource = require("eventsource").EventSource;

const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('http'));
const headersArgIndex = args.indexOf('--headers');
let headers = {};

if (headersArgIndex !== -1 && args[headersArgIndex + 1]) {
  try {
    headers = JSON.parse(args[headersArgIndex + 1]);
  } catch (e) {
    console.error("Failed to parse headers JSON:", e);
    process.exit(1);
  }
}

if (!urlArg) {
  console.error("Usage: node sse-bridge.js <url> [--headers <json_headers>]");
  process.exit(1);
}

// 1. Patch Global EventSource to inject headers
class AuthenticatedEventSource extends EventSource {
  constructor(url: string | URL, eventSourceInitDict?: any) {
    super(url, {
      ...eventSourceInitDict,
      headers: {
        ...eventSourceInitDict?.headers,
        ...headers
      }
    });
  }
}
global.EventSource = AuthenticatedEventSource as any;

// 2. Patch Global Fetch to inject headers (for POST requests)
const originalFetch = global.fetch;
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const newInit = {
    ...init,
    headers: {
      ...init?.headers,
      ...headers
    }
  };
  return originalFetch(input, newInit);
};

async function main() {
  // We use StdioServerTransport to talk to the MCP Client (e.g. Claude Desktop)
  const stdioTransport = new StdioServerTransport();

  // We use SSEClientTransport to talk to the Real MCP Server
  const sseTransport = new SSEClientTransport(new URL(urlArg!));

  // Forward messages
  stdioTransport.onmessage = async (message) => {
    await sseTransport.send(message);
  };

  sseTransport.onmessage = async (message) => {
    await stdioTransport.send(message);
  };
  
  sseTransport.onclose = () => {
    process.exit(0);
  };
  
  sseTransport.onerror = (err) => {
    console.error("SSE Error:", err);
    process.exit(1);
  };

  try {
    await sseTransport.start();
    console.error("Connected to SSE server");
  } catch (err) {
    console.error("Failed to connect to SSE server:", err);
    process.exit(1);
  }

  await stdioTransport.start();
  console.error("Bridge ready");
}

main().catch(err => {
  console.error("Bridge Error:", err);
  process.exit(1);
});
