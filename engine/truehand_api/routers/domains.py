from __future__ import annotations

from functools import cache

from fastapi import APIRouter

from truehand.domains import DOMAIN_FACTORIES, get_model
from truehand.engine import Engine
from truehand.model import InstrumentModel
from truehand.views import catalog_view
from truehand_api.errors import ApiError, clip
from truehand_api.schemas import CatalogView, DomainsView, DomainView

router = APIRouter(prefix="/v1", tags=["domains"])


def model_or_422(domain: str) -> InstrumentModel:
    if domain not in DOMAIN_FACTORIES:
        shown = clip(domain)
        raise ApiError(
            422, "unknown_domain", f"There is no domain called {shown!r}.", field="domain"
        )
    return get_model(domain)


@cache
def default_engine(domain: str) -> Engine:
    return Engine(get_model(domain))


@router.get("/domains", response_model=DomainsView)
def list_domains() -> DomainsView:
    models = [get_model(domain) for domain in DOMAIN_FACTORIES]
    return DomainsView(
        domains=[
            DomainView(id=m.domain, display_name=m.display_name, simulated=m.simulated)
            for m in models
        ]
    )


@router.get("/domains/{domain}/catalog", response_model=CatalogView)
def get_catalog(domain: str, include_expected_readings: bool = False) -> CatalogView:
    model = model_or_422(domain)
    return CatalogView.model_validate(
        catalog_view(model, default_engine(domain), include_expected_readings)
    )
