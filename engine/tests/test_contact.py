"""POST /v1/contact (API_CONTRACT section 13) via ASGITransport; Resend is a MockTransport."""

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest
from pydantic import SecretStr

from truehand_api.main import app
from truehand_api.rate_limit import ContactLimiter
from truehand_api.routers.contact import get_contact_limiter, get_resend_transport
from truehand_api.settings import Settings, get_settings

pytestmark = pytest.mark.anyio
ALLOWED_ORIGIN = "http://localhost:5173"
API_KEY = "re_test_key_never_echo_7f3a9c"
RESEND_URL = "https://api.resend.com/emails"
VALID = {
    "name": "Ada Lovelace",
    "email": "ada@example.org",
    "organization": "Analytical Engines Ltd",
    "phone": "+1 (318) 555-0100",
    "reason": "pilot",
    "message": "We would like to pilot Truehand in our lab.\nTwo classes, spring term.",
}


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


class FakeResend:
    """Records each request to Resend and answers with a fixed status (or raises)."""

    def __init__(self, status: int = 200, fail_with: Exception | None = None) -> None:
        self.status = status
        self.fail_with = fail_with
        self.requests: list[httpx.Request] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self.fail_with is not None:
            raise self.fail_with
        return httpx.Response(self.status, json={"id": "email_123"})

    def payload(self, index: int = 0) -> dict[str, Any]:
        return json.loads(self.requests[index].content)


@pytest.fixture
def resend() -> FakeResend:
    return FakeResend()


@pytest.fixture
def contact_settings() -> Settings:
    return Settings(resend_api_key=SecretStr(API_KEY))


@pytest.fixture
def limiter() -> ContactLimiter:
    return ContactLimiter(per_client=3, window_s=600, global_per_hour=50)


@pytest.fixture
async def client(
    resend: FakeResend, contact_settings: Settings, limiter: ContactLimiter
) -> AsyncIterator[httpx.AsyncClient]:
    app.dependency_overrides[get_settings] = lambda: contact_settings
    app.dependency_overrides[get_contact_limiter] = lambda: limiter
    app.dependency_overrides[get_resend_transport] = lambda: httpx.MockTransport(resend.handler)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()


def assert_error(response: httpx.Response, status: int, code: str) -> dict[str, Any]:
    assert response.status_code == status, response.text
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == code
    assert isinstance(body["error"]["message"], str) and body["error"]["message"]
    return body["error"]


async def post(
    client: httpx.AsyncClient, ip: str = "203.0.113.7", **changes: Any
) -> httpx.Response:
    body = {**VALID, **changes}
    body = {key: value for key, value in body.items() if value is not ...}
    return await client.post("/v1/contact", json=body, headers={"X-Forwarded-For": ip})


async def test_valid_request_sends_one_email_with_subject_reply_to_and_labeled_body(
    client: httpx.AsyncClient, resend: FakeResend
) -> None:
    response = await post(client)
    assert response.status_code == 202, response.text
    assert response.json() == {"status": "sent"}
    assert len(resend.requests) == 1
    request = resend.requests[0]
    assert str(request.url) == RESEND_URL
    assert request.method == "POST"
    assert request.headers["authorization"] == f"Bearer {API_KEY}"
    payload = resend.payload()
    assert payload["from"] == "Truehand <contact@truehand.tech>"
    assert payload["to"] == ["support@truehand.tech"]
    assert payload["reply_to"] == "ada@example.org"
    assert payload["subject"] == "[Pilot] Ada Lovelace (Analytical Engines Ltd)"
    text = payload["text"]
    for line in (
        "Name: Ada Lovelace",
        "Email: ada@example.org",
        "Organization: Analytical Engines Ltd",
        "Phone: +1 (318) 555-0100",
        "Reason: Pilot",
        "Message:\nWe would like to pilot Truehand in our lab.\nTwo classes, spring term.",
    ):
        assert line in text


async def test_subject_omits_organization_when_absent_and_body_says_not_given(
    client: httpx.AsyncClient, resend: FakeResend
) -> None:
    response = await post(client, organization=..., phone="", reason="press")
    assert response.status_code == 202, response.text
    payload = resend.payload()
    assert payload["subject"] == "[Press] Ada Lovelace"
    assert "Organization: not given" in payload["text"]
    assert "Phone: not given" in payload["text"]


async def test_whitespace_is_stripped_before_length_checks(
    client: httpx.AsyncClient, resend: FakeResend
) -> None:
    response = await post(client, name="  Ada  ", email=" ada@example.org ")
    assert response.status_code == 202, response.text
    assert resend.payload()["reply_to"] == "ada@example.org"
    assert resend.payload()["subject"].startswith("[Pilot] Ada (")
    assert_error(await post(client, name="   "), 422, "validation_error")


async def test_crlf_in_message_is_normalized_to_newline(
    client: httpx.AsyncClient, resend: FakeResend
) -> None:
    response = await post(client, message="Line one is here.\r\nLine two\tis tabbed.")
    assert response.status_code == 202, response.text
    assert "Line one is here.\nLine two\tis tabbed." in resend.payload()["text"]


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", ""),
        ("name", "x" * 101),
        ("email", "not-an-email"),
        ("email", "ada@localhost"),
        ("email", "ada@@example.org"),
        ("email", "a" * 245 + "@example.org"),
        ("organization", "o" * 121),
        ("phone", "555-0100 ext. 4"),
        ("phone", "1" * 41),
        ("reason", "sales"),
        ("message", "too short"),
        ("message", "m" * 4001),
        ("message", "Hello there\x00, friend."),
        ("message", "Hello there\x1b[31m, friend."),
        ("name", 42),
    ],
)
async def test_each_validation_rule_answers_422(
    client: httpx.AsyncClient, resend: FakeResend, field: str, value: Any
) -> None:
    error = assert_error(await post(client, **{field: value}), 422, "validation_error")
    assert any(field in entry["loc"] for entry in error["details"]["errors"])
    assert resend.requests == []


@pytest.mark.parametrize("field", ["name", "email", "message", "reason"])
async def test_missing_required_field_answers_422(
    client: httpx.AsyncClient, resend: FakeResend, field: str
) -> None:
    assert_error(await post(client, **{field: ...}), 422, "validation_error")
    assert resend.requests == []


async def test_unknown_field_answers_422(client: httpx.AsyncClient) -> None:
    assert_error(await post(client, cc="evil@example.org"), 422, "validation_error")


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "Ada\r\nBcc: victim@example.org"),
        ("name", "Ada\nBcc: victim@example.org"),
        ("email", "ada@example.org\r\nBcc: victim@example.org"),
        ("organization", "Acme\rBcc: victim@example.org"),
        ("phone", "555\n0100"),
        ("name", "Ada Bcc: victim@example.org"),
    ],
)
async def test_header_injection_through_line_breaks_is_rejected(
    client: httpx.AsyncClient, resend: FakeResend, field: str, value: str
) -> None:
    assert_error(await post(client, **{field: value}), 422, "validation_error")
    assert resend.requests == []


async def test_filled_honeypot_answers_202_and_sends_nothing(
    client: httpx.AsyncClient, resend: FakeResend, limiter: ContactLimiter
) -> None:
    response = await post(client, website="http://spam.example")
    assert response.status_code == 202
    assert response.json() == {"status": "sent"}
    assert resend.requests == []
    for _ in range(3):
        assert (await post(client)).status_code == 202
    assert len(resend.requests) == 3


async def test_empty_honeypot_is_a_normal_request(
    client: httpx.AsyncClient, resend: FakeResend
) -> None:
    assert (await post(client, website="")).status_code == 202
    assert len(resend.requests) == 1


async def test_missing_key_answers_503_contact_unavailable(
    client: httpx.AsyncClient, resend: FakeResend
) -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(resend_api_key=None)
    error = assert_error(await post(client), 503, "contact_unavailable")
    assert "support@truehand.tech" in error["message"]
    assert resend.requests == []


async def test_blank_key_in_the_environment_counts_as_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TRUEHAND_RESEND_API_KEY", "  ")
    assert Settings().resend_api_key is None


async def test_key_is_read_from_the_truehand_environment_variable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TRUEHAND_RESEND_API_KEY", API_KEY)
    key = Settings().resend_api_key
    assert key is not None and key.get_secret_value() == API_KEY
    assert API_KEY not in repr(Settings())


@pytest.mark.parametrize("status", [400, 401, 403, 422, 429, 500, 503])
async def test_resend_rejection_answers_502_contact_send_failed(
    client: httpx.AsyncClient, resend: FakeResend, status: int
) -> None:
    resend.status = status
    assert_error(await post(client), 502, "contact_send_failed")
    assert len(resend.requests) == 1


@pytest.mark.parametrize(
    "failure",
    [httpx.ConnectError("connection refused"), httpx.ReadTimeout("timed out")],
)
async def test_resend_network_failure_answers_502_contact_send_failed(
    client: httpx.AsyncClient, resend: FakeResend, failure: Exception
) -> None:
    resend.fail_with = failure
    assert_error(await post(client), 502, "contact_send_failed")


async def test_fourth_request_from_one_ip_answers_429_with_retry_after(
    client: httpx.AsyncClient, resend: FakeResend
) -> None:
    for _ in range(3):
        assert (await post(client, ip="198.51.100.1")).status_code == 202
    response = await post(client, ip="198.51.100.1")
    error = assert_error(response, 429, "rate_limited")
    retry_after = int(response.headers["retry-after"])
    assert 0 < retry_after <= 600
    assert error["details"]["retry_after_s"] == retry_after
    assert len(resend.requests) == 3
    assert (await post(client, ip="198.51.100.2")).status_code == 202
    assert len(resend.requests) == 4


async def test_client_ip_is_the_first_forwarded_hop(client: httpx.AsyncClient) -> None:
    for _ in range(3):
        assert (await post(client, ip="192.0.2.9, 10.0.0.1")).status_code == 202
    assert_error(await post(client, ip="192.0.2.9, 10.0.0.2"), 429, "rate_limited")
    assert (await post(client, ip="192.0.2.10, 10.0.0.1")).status_code == 202


async def test_without_forwarded_header_the_socket_peer_is_the_client(
    client: httpx.AsyncClient,
) -> None:
    for _ in range(3):
        assert (await client.post("/v1/contact", json=VALID)).status_code == 202
    assert_error(await client.post("/v1/contact", json=VALID), 429, "rate_limited")


async def test_global_hourly_cap_applies_across_ips(
    client: httpx.AsyncClient, resend: FakeResend
) -> None:
    tight = ContactLimiter(per_client=3, window_s=600, global_per_hour=2)
    app.dependency_overrides[get_contact_limiter] = lambda: tight
    assert (await post(client, ip="198.51.100.1")).status_code == 202
    assert (await post(client, ip="198.51.100.2")).status_code == 202
    response = await post(client, ip="198.51.100.3")
    assert_error(response, 429, "rate_limited")
    assert int(response.headers["retry-after"]) > 0
    assert len(resend.requests) == 2


async def test_key_never_appears_in_logs_or_responses(
    client: httpx.AsyncClient, resend: FakeResend, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    responses = [await post(client)]
    resend.status = 401
    responses.append(await post(client, ip="198.51.100.20"))
    resend.fail_with = httpx.ConnectError(f"refused Bearer {API_KEY}")
    responses.append(await post(client, ip="198.51.100.21"))
    assert [response.status_code for response in responses] == [202, 502, 502]
    for response in responses:
        assert API_KEY not in response.text
        assert API_KEY not in str(response.headers)
    assert API_KEY not in caplog.text
    assert "We would like to pilot" not in caplog.text
    assert "status=401" in caplog.text


async def test_body_over_16_kib_answers_413(client: httpx.AsyncClient, resend: FakeResend) -> None:
    oversized = {**VALID, "message": "m" * (17 * 1024)}
    response = await client.post("/v1/contact", json=oversized)
    assert_error(response, 413, "payload_too_large")
    assert resend.requests == []


async def test_cors_preflight_allows_json_post_from_the_web_origin(
    client: httpx.AsyncClient,
) -> None:
    response = await client.options(
        "/v1/contact",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "content-type" in response.headers["access-control-allow-headers"].lower()


async def test_cors_exposes_retry_after_to_the_web_origin(client: httpx.AsyncClient) -> None:
    headers = {"Origin": ALLOWED_ORIGIN, "X-Forwarded-For": "198.51.100.30"}
    for _ in range(4):
        response = await client.post("/v1/contact", json=VALID, headers=headers)
    assert response.status_code == 429
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "retry-after" in response.headers["access-control-expose-headers"].lower()
