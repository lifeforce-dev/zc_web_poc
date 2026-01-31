"""Common models shared across domains."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ServerError(BaseModel):
    """Error message sent to client."""
    type: Literal["error"]
    message: str
