"""
"""
from typing import Awaitable, Callable

from fastapi import FastAPI
import aioredis

from settings import settings


def register_startup_event(app: FastAPI) -> Callable[[], Awaitable[None]]:
    """Actions to run on app startup.

    Uses fastAPI `app` to store data in the state, such as redis connection.

    :param app: the fastAPI app.

    :return: function that actually performs actions.
    """

    @app.on_event('startup')
    async def _startup() -> None:
        print('**************** 111 WHAT')
        app.state.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        print('**************** is going on')
        print(f'**************** {app.state.redis}')

    return _startup


def register_shutdown_event(app: FastAPI) -> Callable[[], Awaitable[None]]:
    """Actions to run on app's shutdown.

    :param app: fastAPI app

    :return: function that actually performs actions.
    """

    @app.on_event('shutdown')
    async def _shutdown() -> None:
        await app.state.redis.close()

    return _shutdown
