from __future__ import annotations

import asyncio
from dataclasses import dataclass

from zc_api.session.registry import SessionRegistry


@dataclass(slots=True)
class MatchAssignment:
    match_id: str
    player_token: str


@dataclass(slots=True)
class WaitingEntry:
    name: str
    future: asyncio.Future[MatchAssignment]


class Matchmaker:
    def __init__(self, registry: SessionRegistry) -> None:
        self._registry = registry
        self._waiting: list[WaitingEntry] = []
        self._lock = asyncio.Lock()

    async def WaitForMatch(self, name: str) -> MatchAssignment:
        loop = asyncio.get_running_loop()
        future: asyncio.Future[MatchAssignment] = loop.create_future()
        entry = WaitingEntry(name=name, future=future)

        async with self._lock:
            while self._waiting:
                other = self._waiting.pop(0)

                if other.future.cancelled():
                    continue

                match_id, token_other, token_self = await self._registry.CreateMatch(other.name, name)

                if not other.future.cancelled():
                    other.future.set_result(MatchAssignment(match_id=match_id, player_token=token_other))

                return MatchAssignment(match_id=match_id, player_token=token_self)

            self._waiting.append(entry)

        try:
            return await future
        finally:
            async with self._lock:
                self._waiting = [w for w in self._waiting if w is not entry]
