"""Truehand API. Routes live under /v1; see docs/API_CONTRACT.md."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from truehand import __version__
from truehand_api.errors import register_error_handlers
from truehand_api.guard import RequestGuard
from truehand_api.routers import contact, domains, health, sessions
from truehand_api.settings import settings

app = FastAPI(
    title="Truehand API",
    version=__version__,
    docs_url="/v1/docs",
    openapi_url="/v1/openapi.json",
)
# Registered first so it sits inside CORSMiddleware (the last-added middleware is outermost):
# its 413 and 500 replies then carry CORS headers for allowed origins.
app.add_middleware(RequestGuard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    # The contact form reads Retry-After on a 429 to tell the visitor how long to wait.
    expose_headers=["Retry-After"],
)
register_error_handlers(app)
app.include_router(health.router)
app.include_router(domains.router)
app.include_router(sessions.router)
app.include_router(contact.router)
