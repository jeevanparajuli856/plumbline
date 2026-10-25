"""Plumbline API. Routes live under /v1; see docs/API_CONTRACT.md."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from plumbline import __version__
from plumbline_api.errors import catch_unhandled, register_error_handlers
from plumbline_api.routers import domains, health, sessions
from plumbline_api.settings import settings

app = FastAPI(
    title="Plumbline API",
    version=__version__,
    docs_url="/v1/docs",
    openapi_url="/v1/openapi.json",
)
# Registered first so it sits inside CORSMiddleware (the last-added middleware is outermost).
app.middleware("http")(catch_unhandled)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
register_error_handlers(app)
app.include_router(health.router)
app.include_router(domains.router)
app.include_router(sessions.router)
