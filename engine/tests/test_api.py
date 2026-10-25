"""HTTP contract tests (API_CONTRACT sections 2-7) through httpx ASGITransport."""

import json
import math
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import httpx
import pytest

from plumbline.domains import get_model
from plumbline_api.main import app
from plumbline_api.settings import Settings, get_settings
from plumbline_api.store import SessionStore, get_store

pytestmark = pytest.mark.anyio
ALLOWED_ORIGIN = "http://localhost:5173"
WORKED = {
    "domain": "circuit",
    "mode": "replay",
    "seed": 1,
    "fixture": "worked_example",
    "reveal": "after_step",
}


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def store() -> SessionStore:
    return SessionStore(max_sessions=8, ttl_s=3600)


@pytest.fixture
async def client(store: SessionStore) -> AsyncIterator[httpx.AsyncClient]:
    app.dependency_overrides[get_store] = lambda: store
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()


def assert_all_floats_finite(value: Any) -> None:
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for item in value.values():
            assert_all_floats_finite(item)
    elif isinstance(value, list):
        for item in value:
            assert_all_floats_finite(item)


def assert_error(response: httpx.Response, status: int, code: str) -> dict[str, Any]:
    assert response.status_code == status, response.text
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == code
    assert isinstance(body["error"]["message"], str) and body["error"]["message"]
    return body["error"]


async def create(client: httpx.AsyncClient, **body: Any) -> dict[str, Any]:
    response = await client.post("/v1/sessions", json=body)
    assert response.status_code == 201, response.text
    return response.json()


async def test_health_reports_ok(client: httpx.AsyncClient) -> None:
    response = await client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_domains_list_both_with_the_simulated_flag(client: httpx.AsyncClient) -> None:
    response = await client.get("/v1/domains")
    assert response.status_code == 200
    domains = {d["id"]: d for d in response.json()["domains"]}
    assert domains["circuit"]["simulated"] is False
    assert domains["thermometer"]["simulated"] is True
    assert domains["thermometer"]["display_name"]


async def test_catalog_keeps_the_engine_order_and_hides_expected_by_default(
    client: httpx.AsyncClient,
) -> None:
    body = (await client.get("/v1/domains/circuit/catalog")).json()
    assert [h["id"] for h in body["hypotheses"]] == list(get_model("circuit").hypothesis_ids)
    assert [s["index"] for s in body["sites"]] == list(range(6))
    assert body["sites"][0]["label"] == "row 1"
    assert len(body["classes"]) == 32
    assert body["reading_unit"] == "V" and body["sigma"] == 0.02
    assert body["expected_readings"] is None
    with_expected = (
        await client.get("/v1/domains/circuit/catalog?include_expected_readings=true")
    ).json()
    assert len(with_expected["expected_readings"]) == 33


async def test_unknown_domain_catalog_is_422(client: httpx.AsyncClient) -> None:
    assert_error(await client.get("/v1/domains/caliper/catalog"), 422, "unknown_domain")


async def test_unknown_domain_session_is_422(client: httpx.AsyncClient) -> None:
    response = await client.post("/v1/sessions", json={**WORKED, "domain": "caliper"})
    assert_error(response, 422, "unknown_domain")


async def test_simulate_steps_without_a_reading_and_rejects_one(client: httpx.AsyncClient) -> None:
    session = await create(
        client,
        domain="circuit",
        mode="simulate",
        seed=4,
        reveal="after_step",
        true_hypothesis="R4_open",
    )
    assert session["instruction"]["site"] == 2
    assert session["true_hypothesis"] is None
    sid = session["session_id"]
    step = (await client.post(f"/v1/sessions/{sid}/step", json={})).json()
    assert (await client.get(f"/v1/sessions/{sid}")).json()["true_hypothesis"] == "R4_open"
    assert step["step_index"] == 0
    assert step["landed_site"] is not None
    assert len(step["instruction"]["gain_bits"]) == 6
    assert_all_floats_finite(step)
    response = await client.post(f"/v1/sessions/{sid}/step", json={"reading": 1.0})
    assert_error(response, 422, "reading_not_allowed")


async def test_simulate_with_reveal_never_hides_truth(client: httpx.AsyncClient) -> None:
    session = await create(client, domain="circuit", mode="simulate", seed=4, reveal="never")
    assert session["true_hypothesis"] is None
    step = (await client.post(f"/v1/sessions/{session['session_id']}/step")).json()
    assert step["landed_site"] is None


async def test_live_requires_a_finite_in_range_reading(client: httpx.AsyncClient) -> None:
    session = await create(client, domain="circuit", mode="live", seed=0, reveal="after_step")
    sid = session["session_id"]
    assert_error(await client.post(f"/v1/sessions/{sid}/step", json={}), 422, "reading_required")
    out = await client.post(f"/v1/sessions/{sid}/step", json={"reading": 50.0})
    assert_error(out, 422, "reading_out_of_range")
    nan = await client.post(
        f"/v1/sessions/{sid}/step",
        content=b'{"reading": NaN}',
        headers={"Content-Type": "application/json"},
    )
    assert_error(nan, 422, "validation_error")
    ok = (await client.post(f"/v1/sessions/{sid}/step", json={"reading": 1.733})).json()
    assert ok["reading"] == 1.733 and ok["landed_site"] is None
    assert ok["misfit"]["active"] is False
    view = (await client.get(f"/v1/sessions/{sid}")).json()
    assert view["true_hypothesis"] is None and len(view["steps"]) == 1


async def test_live_rejects_a_true_hypothesis(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/v1/sessions",
        json={
            "domain": "circuit",
            "mode": "live",
            "seed": 0,
            "reveal": "after_step",
            "true_hypothesis": "R1_open",
        },
    )
    assert_error(response, 422, "validation_error")


async def test_worked_example_replay_tells_the_demo_story(client: httpx.AsyncClient) -> None:
    session = await create(client, **WORKED)
    sid = session["session_id"]
    assert session["instruction"]["site"] == 2
    assert session["entropy_bits"] == pytest.approx(math.log2(33))
    first = (await client.post(f"/v1/sessions/{sid}/step", json={})).json()
    assert first["reading"] == 3.671 and first["landed_site"] == 1
    assert first["placement"]["warning"]["active"] is True
    assert first["placement"]["warning"]["likely_site"] == 1
    assert "row 2" in first["placement"]["warning"]["text"]
    assert first["baseline"]["diagnosis"]["hypothesis_id"] == "R2_short"
    assert first["next_instruction"]["site"] == 2
    second = (await client.post(f"/v1/sessions/{sid}/step", json={"reading": 0.338})).json()
    assert second["status"] == "resolved"
    assert second["diagnosis"]["hypothesis_id"] == "R3_10x_low"
    assert second["next_instruction"] is None
    assert len(second["placement_audit"]) == 2
    terminal = await client.post(f"/v1/sessions/{sid}/step", json={})
    assert_error(terminal, 409, "session_terminal")


async def test_replay_reading_must_match_the_fixture(client: httpx.AsyncClient) -> None:
    sid = (await create(client, **WORKED))["session_id"]
    assert_error(
        await client.post(f"/v1/sessions/{sid}/step", json={"reading": 2.0}),
        409,
        "fixture_mismatch",
    )


async def test_replay_of_the_unresolved_pair_refuses(client: httpx.AsyncClient) -> None:
    sid = (await create(client, **{**WORKED, "fixture": "unresolved_pair"}))["session_id"]
    step: dict[str, Any] = {}
    for _ in range(12):
        step = (await client.post(f"/v1/sessions/{sid}/step", json={})).json()
        if step["status"] != "continue":
            break
    assert step["status"] == "unresolved"
    assert step["unresolved"]["reason"] == "indistinguishable"
    assert step["diagnosis"] is None


async def test_missing_fixture_is_404(client: httpx.AsyncClient) -> None:
    response = await client.post("/v1/sessions", json={**WORKED, "fixture": "nope"})
    assert_error(response, 404, "fixture_not_found")


async def test_fixture_name_is_pattern_checked(client: httpx.AsyncClient) -> None:
    response = await client.post("/v1/sessions", json={**WORKED, "fixture": "../etc/passwd"})
    assert_error(response, 422, "validation_error")


async def test_corrupt_fixture_is_500(client: httpx.AsyncClient, tmp_path: Path) -> None:
    (tmp_path / "broken.json").write_text("{not json")
    app.dependency_overrides[get_settings] = lambda: Settings(fixtures_dir=tmp_path)
    response = await client.post("/v1/sessions", json={**WORKED, "fixture": "broken"})
    assert_error(response, 500, "fixture_corrupt")


async def test_replay_domain_must_match_the_fixture(client: httpx.AsyncClient) -> None:
    response = await client.post("/v1/sessions", json={**WORKED, "domain": "thermometer"})
    assert_error(response, 409, "fixture_mismatch")


async def test_replay_requires_a_fixture(client: httpx.AsyncClient) -> None:
    body = {k: v for k, v in WORKED.items() if k != "fixture"}
    assert_error(await client.post("/v1/sessions", json=body), 422, "validation_error")


async def test_unknown_hypothesis_is_422(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/v1/sessions",
        json={
            "domain": "circuit",
            "mode": "simulate",
            "seed": 0,
            "reveal": "never",
            "true_hypothesis": "R9_open",
        },
    )
    assert_error(response, 422, "unknown_hypothesis")


async def test_extra_fields_and_bad_seeds_are_validation_errors(client: httpx.AsyncClient) -> None:
    assert_error(
        await client.post("/v1/sessions", json={**WORKED, "volts": 1}), 422, "validation_error"
    )
    assert_error(
        await client.post("/v1/sessions", json={**WORKED, "seed": -1}), 422, "validation_error"
    )
    assert_error(
        await client.post("/v1/sessions", json={**WORKED, "seed": 2**32}), 422, "validation_error"
    )


async def test_confusion_override_must_sum_to_one(client: httpx.AsyncClient) -> None:
    base = {"domain": "circuit", "mode": "simulate", "seed": 0, "reveal": "never"}
    bad = {**base, "confusion": {"p_same": 0.9, "p_pm1": 0.1, "p_pm2": 0.1}}
    assert_error(await client.post("/v1/sessions", json=bad), 422, "validation_error")
    good = await create(
        client, **base, confusion={"p_same": 0.6, "p_pm1": 0.15, "p_pm2": 0.05}, sigma=0.05
    )
    assert good["config"]["sigma"] == 0.05
    assert good["config"]["confusion"][2][2] == pytest.approx(0.6)


async def test_unknown_session_is_404(client: httpx.AsyncClient) -> None:
    assert_error(await client.get("/v1/sessions/does-not-exist"), 404, "session_not_found")
    assert_error(
        await client.post("/v1/sessions/does-not-exist/step", json={}), 404, "session_not_found"
    )


async def test_unknown_route_uses_the_envelope(client: httpx.AsyncClient) -> None:
    assert_error(await client.get("/v1/nope"), 404, "not_found")


async def test_reset_returns_to_step_zero_with_the_same_truth(client: httpx.AsyncClient) -> None:
    session = await create(
        client, domain="thermometer", mode="simulate", seed=8, reveal="after_step"
    )
    sid = session["session_id"]
    first = (await client.post(f"/v1/sessions/{sid}/step")).json()
    truth = (await client.get(f"/v1/sessions/{sid}")).json()["true_hypothesis"]
    reset = (await client.post(f"/v1/sessions/{sid}/reset")).json()
    assert reset["steps"] == [] and reset["status"] == "continue"
    assert truth is not None and reset["true_hypothesis"] is None
    again = (await client.post(f"/v1/sessions/{sid}/step")).json()
    assert again["reading"] == first["reading"]
    assert (await client.get(f"/v1/sessions/{sid}")).json()["true_hypothesis"] == truth


async def test_session_view_floats_are_finite_and_probabilities_bounded(
    client: httpx.AsyncClient,
) -> None:
    sid = (await create(client, **WORKED))["session_id"]
    await client.post(f"/v1/sessions/{sid}/step")
    view = (await client.get(f"/v1/sessions/{sid}")).json()
    assert_all_floats_finite(view)
    assert sum(view["belief"]) == pytest.approx(1.0)
    assert all(0.0 <= p <= 1.0 for p in view["steps"][0]["placement"]["probs"])
    json.dumps(view, allow_nan=False)


async def test_cors_allows_the_listed_origin(client: httpx.AsyncClient) -> None:
    response = await client.options(
        "/v1/sessions", headers={"Origin": ALLOWED_ORIGIN, "Access-Control-Request-Method": "POST"}
    )
    assert response.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN


async def test_cors_ignores_an_unlisted_origin(client: httpx.AsyncClient) -> None:
    response = await client.get("/v1/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers
    preflight = await client.options(
        "/v1/sessions",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in preflight.headers


async def test_unhandled_errors_become_internal_error_without_a_trace() -> None:
    from starlette.requests import Request

    from plumbline_api.errors import internal_error

    response = await internal_error(
        Request({"type": "http", "method": "GET", "path": "/"}), RuntimeError("boom")
    )
    body = json.loads(bytes(response.body))
    assert response.status_code == 500
    assert body["error"]["code"] == "internal_error"
    assert "boom" not in response.body.decode()


async def test_out_of_model_live_reading_returns_a_misfit_and_the_same_instruction(
    client: httpx.AsyncClient,
) -> None:
    session = await create(client, domain="circuit", mode="live", seed=0, reveal="after_step")
    sid = session["session_id"]
    step = (await client.post(f"/v1/sessions/{sid}/step", json={"reading": 6.0})).json()
    assert step["misfit"]["active"] is True and step["misfit"]["sigmas"] > 5.0
    assert step["status"] == "continue"
    assert step["next_instruction"]["site"] == 2
    assert step["belief"] == session["belief"]


async def test_a_500_still_carries_cors_headers_for_an_allowed_origin(
    client: httpx.AsyncClient,
) -> None:
    def broken_store() -> SessionStore:
        raise RuntimeError("store exploded")

    app.dependency_overrides[get_store] = broken_store
    response = await client.get("/v1/sessions/anything", headers={"Origin": ALLOWED_ORIGIN})
    error = assert_error(response, 500, "internal_error")
    assert "exploded" not in error["message"]
    assert response.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN


async def test_unknown_routes_and_methods_get_human_sentences(client: httpx.AsyncClient) -> None:
    missing = assert_error(await client.get("/v1/nope"), 404, "not_found")
    assert missing["message"].endswith(".") and missing["message"] != "Not Found"
    wrong = assert_error(await client.delete("/v1/health"), 405, "method_not_allowed")
    assert wrong["message"].endswith(".") and wrong["message"] != "Method Not Allowed"


async def test_oversized_body_with_content_length_is_413_with_cors(
    client: httpx.AsyncClient,
) -> None:
    from plumbline_api.guard import MAX_BODY_BYTES

    body = b'{"reading": 1.0, "pad": "' + b"x" * MAX_BODY_BYTES + b'"}'
    response = await client.post(
        "/v1/sessions",
        content=body,
        headers={"Content-Type": "application/json", "Origin": ALLOWED_ORIGIN},
    )
    error = assert_error(response, 413, "payload_too_large")
    assert error["message"].endswith(".")
    assert response.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN


async def test_oversized_chunked_body_is_413(client: httpx.AsyncClient) -> None:
    from plumbline_api.guard import MAX_BODY_BYTES

    async def chunks() -> AsyncIterator[bytes]:
        for _ in range(4):
            yield b"x" * (MAX_BODY_BYTES // 2)

    response = await client.post(
        "/v1/sessions", content=chunks(), headers={"Content-Type": "application/json"}
    )
    assert "content-length" not in {k.lower() for k in response.request.headers}
    assert_error(response, 413, "payload_too_large")


async def test_small_chunked_body_still_reaches_the_route(client: httpx.AsyncClient) -> None:
    async def chunks() -> AsyncIterator[bytes]:
        yield json.dumps(WORKED).encode()

    response = await client.post(
        "/v1/sessions", content=chunks(), headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 201, response.text
