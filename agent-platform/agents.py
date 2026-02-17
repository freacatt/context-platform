from typing import Protocol


class Agent(Protocol):
    name: str

    def run(self, prompt: str) -> str:
        ...


class EchoAgent:
    name = "echo"

    def run(self, prompt: str) -> str:
        return prompt


class GeneralManager:
    def __init__(self, default_agent: Agent | None = None):
        self.default_agent = default_agent or EchoAgent()

    def handle_task(self, task: str) -> str:
        return self.default_agent.run(task)

