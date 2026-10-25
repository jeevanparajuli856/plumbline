import pytest

from plumbline.domains import get_model
from plumbline.engine import Engine
from plumbline.session import Session
from plumbline_api.errors import ApiError
from plumbline_api.store import SessionStore


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def new_session() -> Session:
    return Session(Engine(get_model("circuit")), mode="live", seed=0)


def test_store_returns_what_it_stored() -> None:
    store = SessionStore(max_sessions=2, ttl_s=10)
    session = new_session()
    sid = store.put(session)
    assert store.get(sid).session is session


def test_least_recently_used_session_is_evicted() -> None:
    store = SessionStore(max_sessions=2, ttl_s=10)
    a, b = store.put(new_session()), store.put(new_session())
    store.get(a)
    c = store.put(new_session())
    store.get(a)
    store.get(c)
    with pytest.raises(ApiError) as error:
        store.get(b)
    assert error.value.code == "session_not_found"


def test_idle_sessions_expire_after_the_ttl() -> None:
    clock = FakeClock()
    store = SessionStore(max_sessions=4, ttl_s=10, clock=clock)
    sid = store.put(new_session())
    clock.now = 9.0
    store.get(sid)
    clock.now = 18.0
    store.get(sid)
    clock.now = 28.5
    with pytest.raises(ApiError):
        store.get(sid)
    assert len(store) == 0
