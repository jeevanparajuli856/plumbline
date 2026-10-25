"""Forwards to the real app; see the package docstring for why this exists."""

from truehand_api.main import app

__all__ = ["app"]
