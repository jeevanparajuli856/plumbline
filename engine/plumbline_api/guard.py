"""Pure ASGI guard, registered inside CORSMiddleware so every reply it makes carries CORS headers.

1. Caps the request body at ``MAX_BODY_BYTES``, by Content-Length and by counting chunked
   bytes, answering 413 ``payload_too_large`` before the route ever sees the body.
2. Turns any unhandled exception into the 500 ``internal_error`` envelope (the app-level
   ``Exception`` handler runs in ServerErrorMiddleware, outside CORS).
"""

from __future__ import annotations

import logging

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from plumbline_api.errors import INTERNAL_ERROR_MESSAGE, envelope

logger = logging.getLogger("plumbline_api")

MAX_BODY_BYTES = 16 * 1024
TOO_LARGE_MESSAGE = "The request body is too large; requests to this API are small JSON objects."


def _declared_length(scope: Scope) -> int | None:
    for name, value in scope.get("headers", []):
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


async def _read_capped_body(receive: Receive) -> tuple[bytes, Message | None]:
    """Read the whole body. Returns (body, None), or (b"", message) once the cap is exceeded
    (``message`` is the last one received, kept so a disconnect is not lost)."""
    chunks: list[bytes] = []
    size = 0
    while True:
        message = await receive()
        if message["type"] != "http.request":
            return b"".join(chunks), message
        chunk = message.get("body", b"")
        size += len(chunk)
        if size > MAX_BODY_BYTES:
            return b"", {"type": "too_large"}
        chunks.append(chunk)
        if not message.get("more_body", False):
            return b"".join(chunks), None


class RequestGuard:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        declared = _declared_length(scope)
        if declared is not None and declared > MAX_BODY_BYTES:
            await self._too_large(scope, receive, send)
            return
        body, interrupt = await _read_capped_body(receive)
        if interrupt is not None and interrupt["type"] == "too_large":
            await self._too_large(scope, receive, send)
            return
        await self._call_app(scope, self._replay(body, interrupt, receive), send)

    @staticmethod
    def _replay(body: bytes, interrupt: Message | None, receive: Receive) -> Receive:
        pending: list[Message] = [{"type": "http.request", "body": body, "more_body": False}]
        if interrupt is not None:
            pending.append(interrupt)

        async def replay() -> Message:
            return pending.pop(0) if pending else await receive()

        return replay

    async def _call_app(self, scope: Scope, receive: Receive, send: Send) -> None:
        started = False

        async def tracking_send(message: Message) -> None:
            nonlocal started
            started = started or message["type"] == "http.response.start"
            await send(message)

        try:
            await self.app(scope, receive, tracking_send)
        except Exception:
            logger.exception("unhandled error")
            if started:
                raise
            await envelope(500, "internal_error", INTERNAL_ERROR_MESSAGE)(scope, receive, send)

    @staticmethod
    async def _too_large(scope: Scope, receive: Receive, send: Send) -> None:
        details = {"max_bytes": MAX_BODY_BYTES}
        response = envelope(413, "payload_too_large", TOO_LARGE_MESSAGE, details)
        await response(scope, receive, send)
