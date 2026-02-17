from fastapi import FastAPI

from .api.workspaces import router as workspaces_router


app = FastAPI()


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(workspaces_router)

