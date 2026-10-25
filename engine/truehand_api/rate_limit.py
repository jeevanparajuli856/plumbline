"""In-memory sliding-window limiter for the contact form: per client and one global hourly cap.

Memory is bounded: each client keeps at most ``per_client`` timestamps, at most ``max_clients``
clients are tracked (least recently admitted evicted first), and clients whose last admitted
request has left the window are dropped. Refused requests are not recorded, so hammering the
endpoint does not extend a client's wait. Nothing here survives a restart; there is no database.
"""

from __future__ import annotations

import math
import threading
import time
from collections import OrderedDict, deque
from collections.abc import Callable

GLOBAL_WINDOW_S = 3600
MAX_TRACKED_CLIENTS = 10_000
MIN_RETRY_AFTER_S = 1


def _retry_after(oldest: float, window_s: float, now: float) -> int:
    return max(MIN_RETRY_AFTER_S, math.ceil(oldest + window_s - now))


class ContactLimiter:
    def __init__(
        self,
        per_client: int,
        window_s: float,
        global_per_hour: int,
        clock: Callable[[], float] = time.monotonic,
        max_clients: int = MAX_TRACKED_CLIENTS,
    ) -> None:
        self.per_client = per_client
        self.window_s = window_s
        self.global_per_hour = global_per_hour
        self._clock = clock
        self._max_clients = max_clients
        self._clients: OrderedDict[str, deque[float]] = OrderedDict()
        self._global: deque[float] = deque()
        self._lock = threading.Lock()

    @property
    def tracked_clients(self) -> int:
        return len(self._clients)

    def admit(self, client: str) -> int | None:
        """Record a request and return None, or return the seconds to wait (nothing recorded)."""
        with self._lock:
            now = self._clock()
            self._expire(now)
            history = self._clients.get(client, deque())
            if len(history) >= self.per_client:
                return _retry_after(history[0], self.window_s, now)
            if len(self._global) >= self.global_per_hour:
                return _retry_after(self._global[0], GLOBAL_WINDOW_S, now)
            history.append(now)
            self._global.append(now)
            self._clients[client] = history
            self._clients.move_to_end(client)
            while len(self._clients) > self._max_clients:
                self._clients.popitem(last=False)
            return None

    def _expire(self, now: float) -> None:
        while self._global and self._global[0] <= now - GLOBAL_WINDOW_S:
            self._global.popleft()
        for history in self._clients.values():
            while history and history[0] <= now - self.window_s:
                history.popleft()
        stale = [client for client, history in self._clients.items() if not history]
        for client in stale:
            del self._clients[client]
