"""Registry of instrument models by domain id."""

from __future__ import annotations

from collections.abc import Callable
from functools import cache

from plumbline.domains.circuit import CircuitModel
from plumbline.model import InstrumentModel

DOMAIN_FACTORIES: dict[str, Callable[[], InstrumentModel]] = {
    "circuit": CircuitModel,
}


@cache
def get_model(domain: str) -> InstrumentModel:
    """Return the shared, immutable model for ``domain``. Raises ``KeyError`` if unknown."""
    return DOMAIN_FACTORIES[domain]()
