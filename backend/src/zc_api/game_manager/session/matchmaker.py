"""Matchmaker - pairs players waiting for games."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass

from .registry import SessionRegistry


@dataclass(slots=True)
class MatchAssignment:
    match_id: str
    player_token: str


@dataclass(slots=True)
class WaitingEntry:
    name: str
    elemental: str
    future: asyncio.Future[MatchAssignment]


class Matchmaker:
    def __init__(self, registry: SessionRegistry) -> None:
        self._registry = registry
        self._waiting: list[WaitingEntry] = []
        self._lock = asyncio.Lock()

    async def wait_for_match(self, name: str, elemental: str) -> MatchAssignment:
        loop = asyncio.get_running_loop()
        future: asyncio.Future[MatchAssignment] = loop.create_future()
        entry = WaitingEntry(name=name, elemental=elemental, future=future)

        async with self._lock:
            while self._waiting:
                other = self._waiting.pop(0)

                if other.future.cancelled():
                    continue

                match_id, token_other, token_self = await self._registry.create_match(
                    other.name, other.elemental, name, elemental
                )

                if not other.future.cancelled():
                    other.future.set_result(MatchAssignment(match_id=match_id, player_token=token_other))

                return MatchAssignment(match_id=match_id, player_token=token_self)

            self._waiting.append(entry)

        return await future
