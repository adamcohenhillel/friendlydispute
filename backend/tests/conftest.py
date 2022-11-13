"""Fixtures for pytests
"""
from typing import AsyncGenerator

import aioredis
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient

from api.app import get_app
from api.dependencies import get_redis_connection
from settings import settings


@pytest_asyncio.fixture
def fastapi_app() -> FastAPI:
    """Fixture for creating FastAPI app.

    :return: fastapi app with mocked dependencies.
    """
    app = get_app()
    app.dependency_overrides[get_redis_connection] = lambda: aioredis.from_url(settings.redis_url, decode_responses=True) 
    return app


@pytest_asyncio.fixture
async def client(fastapi_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Fixture that creates client for requesting server.

    :param fastapi_app: the app.

    :yield: client for the app.
    """
    async with AsyncClient(app=fastapi_app, base_url='http://test') as async_client:
        yield async_client
