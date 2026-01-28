"""Test fixtures and shared configuration."""

import pytest
from fastapi.testclient import TestClient

from zc_api.main import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)
