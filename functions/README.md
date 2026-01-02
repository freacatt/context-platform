# Pyramid Solver MCP Server (Firebase Functions)

This directory contains a Model Context Protocol (MCP) server implemented as a Firebase Cloud Function.
It allows MCP clients (like Claude Desktop, Trae, or VSCode extensions) to connect to your live Firebase data.

## Deployment

To deploy the MCP server:

```bash
# From the root directory
firebase deploy --only functions
```

If you want to deploy the hosting rewrites as well (recommended for cleaner URLs):

```bash
firebase deploy --only functions,hosting
```

## Connecting from Trae / Claude

Once deployed, your MCP server will be available at:
`https://<your-project-id>.web.app/mcp/sse`

Configure your MCP client (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "pyramid-cloud": {
      "url": "https://pyramid-s.web.app/mcp/sse",
      "transport": "sse"
    }
  }
}
```

## Tools Available

- `get_app_context`: View tech stack and database schema.
- `list_pyramids`: List recent pyramids.
- `get_pyramid`: Get full details of a pyramid.
- `list_product_definitions`: List product definitions.
- `get_product_definition`: Get product definition details.

## Note on Reliability

This implementation runs on Firebase Functions (Gen 2). 
MCP uses Server-Sent Events (SSE) which requires a persistent connection.
Firebase Functions may time out (default 60s, configured here for 300s) or scale down.
For a robust production deployment, consider using Cloud Run.
