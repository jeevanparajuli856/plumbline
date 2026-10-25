from truehand_api.rate_limit import GLOBAL_WINDOW_S, ContactLimiter


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def make(clock: FakeClock, **overrides: int) -> ContactLimiter:
    options = {"per_client": 3, "window_s": 600, "global_per_hour": 50, **overrides}
    return ContactLimiter(**options, clock=clock)


def test_admits_up_to_the_per_client_limit_then_reports_retry_after() -> None:
    clock = FakeClock()
    limiter = make(clock)
    assert [limiter.admit("a") for _ in range(3)] == [None, None, None]
    clock.now += 100
    assert limiter.admit("a") == 500


def test_client_is_admitted_again_once_the_oldest_request_leaves_the_window() -> None:
    clock = FakeClock()
    limiter = make(clock)
    for _ in range(3):
        limiter.admit("a")
    clock.now += 600
    assert limiter.admit("a") is None


def test_refused_requests_do_not_extend_the_window() -> None:
    clock = FakeClock()
    limiter = make(clock)
    for _ in range(3):
        limiter.admit("a")
    for _ in range(10):
        clock.now += 1
        assert limiter.admit("a") is not None
    clock.now = 1000.0 + 600
    assert limiter.admit("a") is None


def test_retry_after_is_at_least_one_second() -> None:
    clock = FakeClock()
    limiter = make(clock)
    for _ in range(3):
        limiter.admit("a")
    clock.now += 599.9
    assert limiter.admit("a") == 1


def test_global_cap_counts_every_client_and_reports_its_own_retry_after() -> None:
    clock = FakeClock()
    limiter = make(clock, global_per_hour=2)
    assert limiter.admit("a") is None
    clock.now += 10
    assert limiter.admit("b") is None
    assert limiter.admit("c") == GLOBAL_WINDOW_S - 10
    clock.now = 1000.0 + GLOBAL_WINDOW_S
    assert limiter.admit("c") is None


def test_tracked_clients_are_bounded_and_the_least_recent_is_evicted() -> None:
    clock = FakeClock()
    limiter = ContactLimiter(
        per_client=1, window_s=600, global_per_hour=10_000, clock=clock, max_clients=2
    )
    assert limiter.admit("a") is None
    assert limiter.admit("b") is None
    assert limiter.admit("c") is None
    assert limiter.tracked_clients == 2
    assert limiter.admit("a") is None
    assert limiter.admit("c") is not None


def test_expired_clients_are_dropped_from_memory() -> None:
    clock = FakeClock()
    limiter = make(clock)
    for client in ("a", "b", "c"):
        limiter.admit(client)
    clock.now += 601
    limiter.admit("d")
    assert limiter.tracked_clients == 1
