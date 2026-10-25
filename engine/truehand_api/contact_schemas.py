"""Request and response models for POST /v1/contact (API_CONTRACT section 13)."""

from __future__ import annotations

import unicodedata
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field

NAME_MAX = 100
EMAIL_MAX = 254
ORGANIZATION_MAX = 120
PHONE_MAX = 40
MESSAGE_MIN = 10
MESSAGE_MAX = 4000
HONEYPOT_MAX = 200
# Practical subset of RFC 5321: dot-atom local part (<= 64), a host with at least one dot.
EMAIL_PATTERN = (
    r"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]{1,64}(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$"
)
PHONE_PATTERN = r"^[0-9 +\-().]*$"
# Cc: control characters (CR, LF, NUL, ESC...). Zl, Zp: Unicode line and paragraph separators.
HEADER_UNSAFE_CATEGORIES = frozenset({"Cc", "Zl", "Zp"})
# Cf characters that reorder text (ALM, LRM, RLM, LRE..RLO, LRI..PDI): a subject could read
# backwards. Other Cf characters such as ZWJ and ZWNJ are needed to spell some names.
BIDI_CONTROLS = frozenset(
    "\u061c\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069"
)
MESSAGE_ALLOWED_CONTROLS = frozenset({"\n", "\t"})

Reason = Literal["pilot", "partnership", "support", "press"]
REASON_LABELS: dict[str, str] = {
    "pilot": "Pilot",
    "partnership": "Partnership",
    "support": "Support",
    "press": "Press",
}


def _single_line(value: str) -> str:
    """Fields that reach an email header or subject must not carry line breaks (injection)."""
    if any(unicodedata.category(char) in HEADER_UNSAFE_CATEGORIES for char in value):
        raise ValueError("must be a single line without control characters")
    if any(char in BIDI_CONTROLS for char in value):
        raise ValueError("must not contain text direction controls")
    return value


def _message_text(value: str) -> str:
    """Newlines and tabs are text; every other control character is refused."""
    for char in value:
        if char not in MESSAGE_ALLOWED_CONTROLS and unicodedata.category(char) == "Cc":
            raise ValueError("must not contain control characters other than newline and tab")
    return value


def _normalize_newlines(value: object) -> object:
    return value.replace("\r\n", "\n") if isinstance(value, str) else value


def _blank_is_none(value: object) -> object:
    if isinstance(value, str) and not value.strip():
        return None
    return value


SingleLine = AfterValidator(_single_line)
BlankIsNone = BeforeValidator(_blank_is_none)


class ContactRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: Annotated[str, Field(min_length=1, max_length=NAME_MAX), SingleLine]
    email: Annotated[str, Field(max_length=EMAIL_MAX, pattern=EMAIL_PATTERN), SingleLine]
    organization: Annotated[
        Annotated[str, Field(max_length=ORGANIZATION_MAX), SingleLine] | None, BlankIsNone
    ] = None
    phone: Annotated[
        Annotated[str, Field(max_length=PHONE_MAX, pattern=PHONE_PATTERN), SingleLine] | None,
        BlankIsNone,
    ] = None
    reason: Reason
    message: Annotated[
        str,
        BeforeValidator(_normalize_newlines),
        Field(min_length=MESSAGE_MIN, max_length=MESSAGE_MAX),
        AfterValidator(_message_text),
    ]
    # Honeypot: hidden from people, filled by bots. Non-empty means "pretend to send".
    website: Annotated[str | None, Field(max_length=HONEYPOT_MAX)] = None

    @property
    def is_bot(self) -> bool:
        return bool(self.website)


class ContactAccepted(BaseModel):
    status: Literal["sent"]
