from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def root() -> dict[str, object]:
    return {
        "service": "zc_web_poc",
        "status": "ok",
        "docs": "/docs",
    }


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
