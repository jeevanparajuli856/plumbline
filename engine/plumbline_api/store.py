"""In-memory session store: LRU capacity plus idle TTL. No database, by rule."""

from __future__ import annotations

import threading
import time
import uuid
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass, field

from plumbline.session import Session
from plumbline_api.errors import ApiError
from plumbline_api.settings import settings


@dataclass
class StoredSession:
    session: Session
    last_access: float
    lock: threading.Lock = field(default_factory=threading.Lock)


class SessionStore:
    def __init__(
        self, max_sessions: int, ttl_s: float, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self._max = max_sessions
        self._ttl = ttl_s
        self._clock = clock
        self._entries: OrderedDict[str, StoredSession] = OrderedDict()
        self._lock = threading.Lock()

    def __len__(self) -> int:
        with self._lock:
            self._purge_expired()
            return len(self._entries)

    def put(self, session: Session) -> str:
        session_id = str(uuid.uuid4())
        with self._lock:
            self._purge_expired()
            self._entries[session_id] = StoredSession(session, self._clock())
            while len(self._entries) > self._max:
                self._entries.popitem(last=False)
        return session_id

    def get(self, session_id: str) -> StoredSession:
        with self._lock:
            self._purge_expired()
            entry = self._entries.get(session_id)
            if entry is None:
                raise ApiError(
                    404,
                    "session_not_found",
                    "No session with that id; it may have expired.",
                    id=session_id,
                )
            entry.last_access = self._clock()
            self._entries.move_to_end(session_id)
            return entry

    def _purge_expired(self) -> None:
        cutoff = self._clock() - self._ttl
        expired = [sid for sid, entry in self._entries.items() if entry.last_access < cutoff]
        for sid in expired:
            del self._entries[sid]


store = SessionStore(settings.session_max, settings.session_ttl_s)


def get_store() -> SessionStore:
    return store
