from __future__ import annotations

from fastapi import APIRouter

from plumbline import __version__
from plumbline_api.schemas import HealthView

router = APIRouter(prefix="/v1", tags=["health"])


@router.get("/health", response_model=HealthView)
def health() -> HealthView:
    return HealthView(status="ok", version=__version__)
