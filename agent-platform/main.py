from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.exceptions import AppError

from api.workspaces import router as workspaces_router
from api.agents import router as agents_router
from api.chat import router as chat_router
from api.apps import router as apps_router
from api.models import router as models_router
from api.recommend import router as recommend_router


app = FastAPI(title="Pyramid Agent Platform", version="2.0.0")

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers — all return JSONResponse so CORSMiddleware can add headers
@app.exception_handler(HTTPException)
async def http_error_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": {"code": "HTTP_ERROR", "message": exc.detail},
        },
    )


@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": {"code": exc.code, "message": exc.message},
        },
    )


@app.exception_handler(Exception)
async def generic_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": {"code": "INTERNAL_ERROR", "message": str(exc)},
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(workspaces_router)
app.include_router(agents_router)
app.include_router(chat_router)
app.include_router(apps_router)
app.include_router(models_router)
app.include_router(recommend_router)
