"""Compose the contact email and hand it to the Resend HTTP API. Nothing is stored.

Logs carry the Resend status or the exception class only: never the key, never the message.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx
from pydantic import SecretStr

from truehand_api.contact_schemas import REASON_LABELS, ContactRequest

logger = logging.getLogger("truehand_api")

RESEND_URL = "https://api.resend.com/emails"
RESEND_TIMEOUT_S = 10.0
NOT_GIVEN = "not given"


@dataclass(frozen=True)
class OutgoingEmail:
    sender: str
    to: str
    reply_to: str
    subject: str
    text: str


class MailSendError(Exception):
    """Resend refused the email or could not be reached; the route answers 502."""


def compose(body: ContactRequest, sender: str, to: str) -> OutgoingEmail:
    reason = REASON_LABELS[body.reason]
    subject = f"[{reason}] {body.name}"
    if body.organization:
        subject += f" ({body.organization})"
    text = "\n".join(
        [
            f"Name: {body.name}",
            f"Email: {body.email}",
            f"Organization: {body.organization or NOT_GIVEN}",
            f"Phone: {body.phone or NOT_GIVEN}",
            f"Reason: {reason}",
            "Message:",
            body.message,
            "",
            "Sent through the contact form on truehand.tech. "
            "Reply to answer the sender (address not verified).",
        ]
    )
    return OutgoingEmail(sender=sender, to=to, reply_to=body.email, subject=subject, text=text)


class ResendSender:
    def __init__(
        self, api_key: SecretStr, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._api_key = api_key
        self._transport = transport

    async def send(self, email: OutgoingEmail) -> None:
        payload = {
            "from": email.sender,
            "to": [email.to],
            "reply_to": email.reply_to,
            "subject": email.subject,
            "text": email.text,
        }
        headers = {"Authorization": f"Bearer {self._api_key.get_secret_value()}"}
        try:
            async with httpx.AsyncClient(
                transport=self._transport, timeout=RESEND_TIMEOUT_S
            ) as client:
                response = await client.post(RESEND_URL, json=payload, headers=headers)
        except httpx.HTTPError as error:
            logger.warning("contact email not sent: %s reaching Resend", type(error).__name__)
            raise MailSendError from None
        if not response.is_success:
            logger.warning(
                "contact email not sent: Resend answered status=%d", response.status_code
            )
            raise MailSendError
