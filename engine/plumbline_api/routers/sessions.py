from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from plumbline.config import ConfusionSpec, EngineConfig
from plumbline.engine import Engine
from plumbline.fixture_io import engine_from_fixture
from plumbline.session import ReplayScript, Session
from plumbline_api.errors import ApiError
from plumbline_api.routers.domains import default_engine, model_or_422
from plumbline_api.schemas import CreateSession, SessionView, StepRequest, StepView
from plumbline_api.settings import Settings, get_settings
from plumbline_api.store import SessionStore, get_store

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])
StoreDep = Annotated[SessionStore, Depends(get_store)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _invalid(field: str, message: str) -> ApiError:
    return ApiError(422, "validation_error", message, field=field)


def _load_fixture(name: str, settings: Settings) -> dict[str, Any]:
    path = settings.fixtures_dir / f"{name}.json"
    if not path.is_file():
        raise ApiError(404, "fixture_not_found", f"No fixture called {name!r}.", fixture=name)
    try:
        fixture = json.loads(path.read_text())
        engine_from_fixture(fixture)
        ReplayScript.from_mapping(fixture)
    except (ValueError, KeyError, TypeError) as error:
        raise ApiError(
            500, "fixture_corrupt", f"Fixture {name!r} could not be loaded.", fixture=name
        ) from error
    return fixture


def _engine_for(body: CreateSession) -> Engine:
    if body.sigma is None and body.confusion is None:
        return default_engine(body.domain)
    confusion = ConfusionSpec()
    if body.confusion is not None:
        confusion = ConfusionSpec(
            p_same=body.confusion.p_same, p_pm1=body.confusion.p_pm1, p_pm2=body.confusion.p_pm2
        )
    return Engine(model_or_422(body.domain), EngineConfig(sigma=body.sigma, confusion=confusion))


def _check_mode_fields(body: CreateSession) -> None:
    if body.true_hypothesis is not None and body.mode != "simulate":
        raise _invalid("true_hypothesis", "true_hypothesis is only accepted in simulate mode.")
    if body.mode == "replay":
        if body.fixture is None:
            raise _invalid("fixture", "Replay mode needs a fixture name.")
        if body.sigma is not None or body.confusion is not None:
            raise _invalid("sigma", "Replay uses the fixture's own sigma and confusion.")
    elif body.fixture is not None:
        raise _invalid("fixture", "A fixture is only accepted in replay mode.")


def _build_session(body: CreateSession, settings: Settings) -> Session:
    model = model_or_422(body.domain)
    _check_mode_fields(body)
    if body.mode == "replay":
        assert body.fixture is not None
        fixture = _load_fixture(body.fixture, settings)
        if fixture.get("domain") != body.domain:
            raise ApiError(
                409, "fixture_mismatch", "The fixture belongs to another domain.", field="domain"
            )
        script = ReplayScript.from_mapping(fixture)
        return Session(
            engine_from_fixture(fixture), "replay", body.seed, fixture=script, reveal=body.reveal
        )
    if body.true_hypothesis is not None and body.true_hypothesis not in model.hypothesis_ids:
        raise ApiError(
            422,
            "unknown_hypothesis",
            f"{body.true_hypothesis!r} is not in the catalog.",
            field="true_hypothesis",
        )
    return Session(
        _engine_for(body),
        body.mode,
        body.seed,
        true_hypothesis=body.true_hypothesis,
        reveal=body.reveal,
    )


def _session_view(session_id: str, session: Session) -> SessionView:
    return SessionView.model_validate(
        {"session_id": session_id, **session.view(include_truth=True)}
    )


@router.post("", response_model=SessionView, status_code=status.HTTP_201_CREATED)
def create_session(body: CreateSession, store: StoreDep, settings: SettingsDep) -> SessionView:
    session = _build_session(body, settings)
    return _session_view(store.put(session), session)


@router.get("/{session_id}", response_model=SessionView)
def get_session(session_id: str, store: StoreDep) -> SessionView:
    entry = store.get(session_id)
    with entry.lock:
        return _session_view(session_id, entry.session)


@router.post("/{session_id}/step", response_model=StepView)
def step_session(session_id: str, store: StoreDep, body: StepRequest | None = None) -> StepView:
    entry = store.get(session_id)
    reading = body.reading if body is not None else None
    with entry.lock:
        record = entry.session.step(reading)
        return StepView.model_validate(entry.session.step_view(record, include_truth=True))


@router.post("/{session_id}/reset", response_model=SessionView)
def reset_session(session_id: str, store: StoreDep) -> SessionView:
    entry = store.get(session_id)
    with entry.lock:
        entry.session.reset()
        return _session_view(session_id, entry.session)
