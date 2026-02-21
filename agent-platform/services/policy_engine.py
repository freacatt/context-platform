from google.cloud.firestore_v1.client import Client

from core.exceptions import ForbiddenError, NotFoundError


class PolicyEngine:
    def __init__(self, db: Client) -> None:
        self.db = db

    def assert_workspace_owner(self, firebase_uid: str, workspace_id: str) -> dict:
        """Verify that *firebase_uid* owns *workspace_id*.

        Returns the workspace document dict on success.
        Raises NotFoundError or ForbiddenError on failure.
        """
        ws_ref = self.db.collection("workspaces").document(workspace_id)
        ws_doc = ws_ref.get()
        if not ws_doc.exists:
            raise NotFoundError("workspace", workspace_id)
        ws_data = ws_doc.to_dict()
        if ws_data.get("userId") != firebase_uid:
            raise ForbiddenError("You do not own this workspace")
        return ws_data

    def assert_agent_access(self, firebase_uid: str, agent_id: str) -> dict:
        """Verify that *firebase_uid* owns the agent (via workspace).

        Returns the agent document dict on success.
        """
        agent_ref = self.db.collection("agents").document(agent_id)
        agent_doc = agent_ref.get()
        if not agent_doc.exists:
            raise NotFoundError("agent", agent_id)
        agent_data = agent_doc.to_dict()
        self.assert_workspace_owner(firebase_uid, agent_data["workspaceId"])
        return agent_data
