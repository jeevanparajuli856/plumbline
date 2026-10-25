"""Error envelope {"error": {code, message, details}} for every failure (API_CONTRACT section 5)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from plumbline.errors import SessionError

logger = logging.getLogger("plumbline_api")

SESSION_ERROR_STATUS = {
    "reading_required": 422,
    "reading_not_allowed": 422,
    "reading_out_of_range": 422,
    "session_terminal": 409,
    "fixture_mismatch": 409,
    "numerically_degenerate": 422,
}
HTTP_STATUS_ERRORS = {
    404: ("not_found", "There is nothing at this address."),
    405: ("method_not_allowed", "This address does not accept that method."),
}
INTERNAL_ERROR_MESSAGE = "Something went wrong on the server."
BAD_BODY_MESSAGE = "The request body could not be read as JSON."
ECHO_MAX_CHARS = 64


def clip(text: str, limit: int = ECHO_MAX_CHARS) -> str:
    """Bound any client-supplied text echoed back in a message or details."""
    return text if len(text) <= limit else text[:limit] + "..."


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, **details: object) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def envelope(
    status: int, code: str, message: str, details: dict[str, Any] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "details": details or {}}},
    )


async def _api_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, ApiError)
    return envelope(exc.status, exc.code, exc.message, exc.details)


async def _session_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, SessionError)
    return envelope(SESSION_ERROR_STATUS.get(exc.code, 409), exc.code, str(exc), exc.details)


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    errors = [
        {
            "loc": [str(part) for part in error.get("loc", ())],
            "msg": error.get("msg", ""),
            "type": error.get("type", ""),
        }
        for error in exc.errors()
    ]
    return envelope(422, "validation_error", "The request body is not valid.", {"errors": errors})


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    if exc.status_code == 400:
        return envelope(422, "validation_error", BAD_BODY_MESSAGE)
    code, message = HTTP_STATUS_ERRORS.get(exc.status_code, ("http_error", "The request failed."))
    return envelope(exc.status_code, code, message)


async def internal_error(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error", exc_info=exc)
    return envelope(500, "internal_error", INTERNAL_ERROR_MESSAGE)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error)
    app.add_exception_handler(SessionError, _session_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(Exception, internal_error)
