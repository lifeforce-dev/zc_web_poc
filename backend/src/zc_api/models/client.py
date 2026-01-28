from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ClientPing(BaseModel):
    type: Literal["ping"]


ClientMessage = ClientPing
