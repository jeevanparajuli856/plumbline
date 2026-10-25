"""POST /v1/contact: validate, rate-limit, email support through Resend (ADR-0014 decision 6).

Order: the honeypot answers first (a bot learns nothing and cannot spend the global cap), then a
missing key answers 503, then the limiter, then one send. Bodies over 16 KiB never reach this
route: RequestGuard answers 413 first.
"""

from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Request, status

from truehand_api.contact_schemas import ContactAccepted, ContactRequest
from truehand_api.errors import ApiError
from truehand_api.mailer import MailSendError, ResendSender, compose
from truehand_api.rate_limit import ContactLimiter
from truehand_api.settings import Settings, get_settings, settings

router = APIRouter(prefix="/v1", tags=["contact"])

UNAVAILABLE_MESSAGE = "The contact form is not available right now; please write to {to} instead."
SEND_FAILED_MESSAGE = (
    "Your message could not be sent right now; please try again later or write to {to}."
)
RATE_LIMITED_MESSAGE = "Too many messages in a short time; please try again in a few minutes."
UNKNOWN_CLIENT = "unknown"

_limiter = ContactLimiter(
    per_client=settings.contact_max_per_window,
    window_s=settings.contact_window_s,
    global_per_hour=settings.contact_global_per_hour,
)


def get_contact_limiter() -> ContactLimiter:
    """FastAPI dependency; tests override it with a fresh limiter."""
    return _limiter


def get_resend_transport() -> httpx.AsyncBaseTransport | None:
    """FastAPI dependency; None means the real network. Tests return an httpx.MockTransport."""
    return None


def client_ip(request: Request) -> str:
    """Render proxies every request, so the first X-Forwarded-For hop is the visitor."""
    forwarded = request.headers.get("x-forwarded-for", "")
    first_hop = forwarded.split(",", 1)[0].strip()
    if first_hop:
        return first_hop
    return request.client.host if request.client else UNKNOWN_CLIENT


SettingsDep = Annotated[Settings, Depends(get_settings)]
LimiterDep = Annotated[ContactLimiter, Depends(get_contact_limiter)]
TransportDep = Annotated[httpx.AsyncBaseTransport | None, Depends(get_resend_transport)]
SENT = ContactAccepted(status="sent")


@router.post("/contact", response_model=ContactAccepted, status_code=status.HTTP_202_ACCEPTED)
async def contact(
    body: ContactRequest,
    request: Request,
    config: SettingsDep,
    limiter: LimiterDep,
    transport: TransportDep,
) -> ContactAccepted:
    if body.is_bot:
        return SENT
    if config.resend_api_key is None:
        raise ApiError(503, "contact_unavailable", UNAVAILABLE_MESSAGE.format(to=config.contact_to))
    retry_after = limiter.admit(client_ip(request))
    if retry_after is not None:
        raise ApiError(429, "rate_limited", RATE_LIMITED_MESSAGE, retry_after_s=retry_after)
    email = compose(body, sender=config.contact_from, to=config.contact_to)
    try:
        await ResendSender(config.resend_api_key, transport).send(email)
    except MailSendError:
        raise ApiError(
            502, "contact_send_failed", SEND_FAILED_MESSAGE.format(to=config.contact_to)
        ) from None
    return SENT
