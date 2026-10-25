"""Refusals the engine raises on purpose. ``code`` is the API error code they map to."""

from __future__ import annotations


class SessionError(Exception):
    """Base for refusals the API maps to its error envelope."""

    code = "session_error"

    def __init__(self, message: str, **details: object) -> None:
        super().__init__(message)
        self.details = details
