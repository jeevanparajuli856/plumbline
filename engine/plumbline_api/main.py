"""Plumbline API. Routes live under /v1; see docs/API_CONTRACT.md."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from plumbline import __version__
from plumbline_api.settings import settings

app = FastAPI(
    title="Plumbline API",
    version=__version__,
    docs_url="/v1/docs",
    openapi_url="/v1/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}
