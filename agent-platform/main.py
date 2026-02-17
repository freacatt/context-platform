from fastapi import FastAPI

from api.workspaces import router as workspaces_router
from api.conversations import router as conversations_router
from api.apps import router as apps_router


app = FastAPI()


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(workspaces_router)
app.include_router(conversations_router)
app.include_router(apps_router)
