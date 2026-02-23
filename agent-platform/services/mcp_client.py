"""MCP client — connect to external MCP servers, discover and call tools."""

import logging
from dataclasses import dataclass, field

import httpx

from tools.base import ToolAction, ToolDefinition

logger = logging.getLogger(__name__)

# Timeout for MCP server HTTP calls
MCP_TIMEOUT = 10.0


@dataclass
class McpServerConfig:
    """Configuration for an external MCP server."""
    name: str
    url: str
    auth: dict = field(default_factory=dict)


class McpClient:
    """Client for a single external MCP server."""

    def __init__(self, config: McpServerConfig):
        self.config = config
        self.name = config.name
        self.url = config.url.rstrip("/")
        self._tools: list[dict] = []
        self._connected = False

    def _build_headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        auth = self.config.auth
        auth_type = auth.get("type", "")
        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {auth.get('token', '')}"
        elif auth_type == "api_key":
            headers["X-API-Key"] = auth.get("key", "")
        return headers

    def connect(self) -> list[dict]:
        """Connect to the MCP server and discover available tools.

        Returns list of raw tool descriptors from the server.
        """
        try:
            response = httpx.post(
                f"{self.url}/tools/list",
                headers=self._build_headers(),
                json={},
                timeout=MCP_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
            self._tools = data.get("tools", [])
            self._connected = True
            logger.info("Connected to MCP server '%s': %d tools", self.name, len(self._tools))
            return self._tools
        except Exception as e:
            logger.warning("Failed to connect to MCP server '%s': %s", self.name, e)
            self._tools = []
            self._connected = False
            return []

    def call_tool(self, tool_name: str, args: dict) -> dict:
        """Call a tool on the MCP server."""
        if not self._connected:
            return {"success": False, "error": f"Not connected to MCP server '{self.name}'"}

        try:
            response = httpx.post(
                f"{self.url}/tools/call",
                headers=self._build_headers(),
                json={"name": tool_name, "arguments": args},
                timeout=MCP_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "result": data.get("content", data)}
        except httpx.HTTPStatusError as e:
            return {"success": False, "error": f"MCP server error: {e.response.status_code}"}
        except Exception as e:
            return {"success": False, "error": f"MCP call failed: {str(e)}"}

    def disconnect(self):
        """Mark client as disconnected."""
        self._connected = False
        self._tools = []

    @property
    def tools(self) -> list[dict]:
        return self._tools

    @property
    def connected(self) -> bool:
        return self._connected


class McpConnectionManager:
    """Manages connections to multiple MCP servers for an agent."""

    def __init__(self):
        self._clients: dict[str, McpClient] = {}

    def connect_all(self, mcp_servers: list[dict]) -> list[ToolDefinition]:
        """Connect to all MCP servers and return discovered ToolDefinitions.

        Tool IDs are prefixed with 'mcp:{server_name}:' to avoid collisions.
        """
        all_tools = []

        for server_config in mcp_servers:
            config = McpServerConfig(
                name=server_config.get("name", "unknown"),
                url=server_config.get("url", ""),
                auth=server_config.get("auth", {}),
            )

            if not config.url:
                logger.warning("MCP server '%s' has no URL, skipping", config.name)
                continue

            client = McpClient(config)
            raw_tools = client.connect()
            self._clients[config.name] = client

            for raw_tool in raw_tools:
                tool_name = raw_tool.get("name", "unknown")
                tool_id = f"mcp:{config.name}:{tool_name}"
                description = raw_tool.get("description", f"MCP tool from {config.name}")
                parameters = raw_tool.get("inputSchema", {"type": "object", "properties": {}})

                # Build handler that calls the MCP server
                handler = _make_mcp_handler(client, tool_name)

                td = ToolDefinition(
                    tool_id=tool_id,
                    app_id=f"mcp:{config.name}",
                    action=ToolAction.CREATE,  # Generic action for MCP tools
                    name=tool_name,
                    description=description,
                    parameters=parameters,
                    handler=handler,
                )
                all_tools.append(td)

        return all_tools

    def disconnect_all(self):
        """Disconnect from all MCP servers."""
        for client in self._clients.values():
            client.disconnect()
        self._clients.clear()

    def get_client(self, server_name: str) -> McpClient | None:
        return self._clients.get(server_name)


def _make_mcp_handler(client: McpClient, tool_name: str):
    """Create a tool handler that calls an MCP server tool."""
    def handler(db, workspace_id, user_id, params):
        return client.call_tool(tool_name, params)
    return handler
