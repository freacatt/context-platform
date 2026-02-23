"""Tests for the MCP client."""

from unittest.mock import patch, MagicMock

import pytest
import httpx

from services.mcp_client import McpClient, McpConnectionManager, McpServerConfig


def _mock_tools_response():
    """Simulated MCP server /tools/list response."""
    return {
        "tools": [
            {
                "name": "create_issue",
                "description": "Create a GitHub issue",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "body": {"type": "string"},
                    },
                    "required": ["title"],
                },
            },
            {
                "name": "list_repos",
                "description": "List repositories",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                },
            },
        ]
    }


@patch("services.mcp_client.httpx.post")
def test_connect_discovers_tools(mock_post):
    """Connect discovers tools from MCP server."""
    mock_response = MagicMock()
    mock_response.json.return_value = _mock_tools_response()
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    config = McpServerConfig(name="github", url="https://mcp.example.com")
    client = McpClient(config)
    tools = client.connect()

    assert client.connected is True
    assert len(tools) == 2
    assert tools[0]["name"] == "create_issue"
    mock_post.assert_called_once()


@patch("services.mcp_client.httpx.post")
def test_connect_with_bearer_auth(mock_post):
    """Auth headers are sent correctly."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"tools": []}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    config = McpServerConfig(
        name="github",
        url="https://mcp.example.com",
        auth={"type": "bearer", "token": "my-secret-token"},
    )
    client = McpClient(config)
    client.connect()

    call_kwargs = mock_post.call_args
    headers = call_kwargs.kwargs.get("headers", call_kwargs[1].get("headers", {}))
    assert headers["Authorization"] == "Bearer my-secret-token"


@patch("services.mcp_client.httpx.post")
def test_connect_failure_graceful(mock_post):
    """Connection failure is handled gracefully."""
    mock_post.side_effect = httpx.ConnectError("Connection refused")

    config = McpServerConfig(name="broken", url="https://broken.example.com")
    client = McpClient(config)
    tools = client.connect()

    assert client.connected is False
    assert tools == []


@patch("services.mcp_client.httpx.post")
def test_call_tool(mock_post):
    """Tool call sends correct request and returns result."""
    # First call: connect
    connect_response = MagicMock()
    connect_response.json.return_value = _mock_tools_response()
    connect_response.raise_for_status = MagicMock()

    # Second call: tool call
    call_response = MagicMock()
    call_response.json.return_value = {"content": [{"type": "text", "text": "Issue created #42"}]}
    call_response.raise_for_status = MagicMock()

    mock_post.side_effect = [connect_response, call_response]

    config = McpServerConfig(name="github", url="https://mcp.example.com")
    client = McpClient(config)
    client.connect()

    result = client.call_tool("create_issue", {"title": "Bug report"})
    assert result["success"] is True
    assert isinstance(result["result"], list)
    assert result["result"][0]["text"] == "Issue created #42"


def test_call_tool_not_connected():
    """Calling tool on disconnected client returns error."""
    config = McpServerConfig(name="github", url="https://mcp.example.com")
    client = McpClient(config)
    result = client.call_tool("create_issue", {"title": "Test"})
    assert result["success"] is False
    assert "Not connected" in result["error"]


@patch("services.mcp_client.httpx.post")
def test_call_tool_server_error(mock_post):
    """HTTP error from MCP server is handled."""
    # Connect succeeds
    connect_response = MagicMock()
    connect_response.json.return_value = {"tools": [{"name": "test_tool"}]}
    connect_response.raise_for_status = MagicMock()

    # Tool call fails
    error_response = MagicMock()
    error_response.status_code = 500
    error_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Server Error", request=MagicMock(), response=error_response,
    )

    mock_post.side_effect = [connect_response, error_response]

    config = McpServerConfig(name="broken", url="https://mcp.example.com")
    client = McpClient(config)
    client.connect()
    result = client.call_tool("test_tool", {})

    assert result["success"] is False
    assert "500" in result["error"]


@patch("services.mcp_client.httpx.post")
def test_disconnect(mock_post):
    """Disconnect clears state."""
    mock_response = MagicMock()
    mock_response.json.return_value = _mock_tools_response()
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    config = McpServerConfig(name="github", url="https://mcp.example.com")
    client = McpClient(config)
    client.connect()
    assert client.connected is True

    client.disconnect()
    assert client.connected is False
    assert client.tools == []


@patch("services.mcp_client.httpx.post")
def test_connection_manager_connect_all(mock_post):
    """Manager connects to multiple servers and merges tools."""
    mock_response = MagicMock()
    mock_response.json.return_value = _mock_tools_response()
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    manager = McpConnectionManager()
    servers = [
        {"name": "github", "url": "https://github-mcp.example.com"},
        {"name": "slack", "url": "https://slack-mcp.example.com"},
    ]
    tools = manager.connect_all(servers)

    # 2 tools from each server = 4 total
    assert len(tools) == 4
    tool_ids = {t.tool_id for t in tools}
    assert "mcp:github:create_issue" in tool_ids
    assert "mcp:slack:list_repos" in tool_ids


@patch("services.mcp_client.httpx.post")
def test_connection_manager_tool_id_namespacing(mock_post):
    """MCP tools are namespaced with mcp:{server}:{tool} format."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"tools": [{"name": "my_tool", "description": "A tool"}]}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    manager = McpConnectionManager()
    tools = manager.connect_all([{"name": "my_server", "url": "https://example.com"}])

    assert len(tools) == 1
    assert tools[0].tool_id == "mcp:my_server:my_tool"
    assert tools[0].app_id == "mcp:my_server"


def test_connection_manager_skip_no_url():
    """Servers without URLs are skipped."""
    manager = McpConnectionManager()
    tools = manager.connect_all([{"name": "no_url", "url": ""}])
    assert tools == []


@patch("services.mcp_client.httpx.post")
def test_connection_manager_disconnect_all(mock_post):
    """Disconnect clears all clients."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"tools": []}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    manager = McpConnectionManager()
    manager.connect_all([{"name": "test", "url": "https://example.com"}])
    assert manager.get_client("test") is not None

    manager.disconnect_all()
    assert manager.get_client("test") is None


@patch("services.mcp_client.httpx.post")
def test_mcp_handler_calls_tool(mock_post):
    """Handler created from MCP tool properly calls the MCP server."""
    # Connect
    connect_response = MagicMock()
    connect_response.json.return_value = {"tools": [{"name": "do_thing", "description": "Do it"}]}
    connect_response.raise_for_status = MagicMock()

    # Tool call
    call_response = MagicMock()
    call_response.json.return_value = {"content": "done"}
    call_response.raise_for_status = MagicMock()

    mock_post.side_effect = [connect_response, call_response]

    manager = McpConnectionManager()
    tools = manager.connect_all([{"name": "test_srv", "url": "https://example.com"}])

    assert len(tools) == 1
    # Call the handler (db, workspace_id, user_id are ignored for MCP handlers)
    result = tools[0].handler(None, "ws-1", "user-1", {"param": "value"})
    assert result["success"] is True
