# Local MCP Server for Pyramid Solver

This server connects your local IDE (Trae, VSCode, Claude) to your **live Firebase data** directly from your machine.

## 1. Setup Credentials (REQUIRED)

This server needs permission to access your database.

1. Go to [Firebase Console > Project Settings > Service accounts](https://console.firebase.google.com/project/pyramid-s/settings/serviceaccounts/adminsdk).
2. Click **Generate new private key**.
3. Download the JSON file.
4. Rename it to `service-account.json`.
5. Move it into this folder:
   `/home/pouria/projects/pyramid-solver/mcp-server/service-account.json`

## 2. Configure Trae / Claude Desktop

You need to tell your IDE where to find this server.

**For Claude Desktop:**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows).

**For Trae:**
Edit your MCP settings file (typically found in Settings > MCP).

Add this configuration:

```json
{
  "mcpServers": {
    "pyramid-local": {
      "command": "node",
      "args": [
        "/home/pouria/projects/pyramid-solver/mcp-server/build/index.js"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/home/pouria/projects/pyramid-solver/mcp-server/service-account.json"
      }
    }
  }
}
```

## 3. Restart & Use

1. Restart Trae or Claude.
2. The server `pyramid-local` should now be active.
3. Ask questions like:
   - "List my pyramids"
   - "Get details for pyramid ID..."

## Troubleshooting

- **"Module not found"**: Run `npm install` in this directory.
- **"Permission denied"**: Ensure `service-account.json` is correct and path is absolute.
- **Updates**: If you change the code in `src/`, run `npm run build` to update the server.
