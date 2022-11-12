"""Deeper 2022, All Rights Reserved
"""
from typing import AsyncGenerator

from starlette.requests import Request
from aioredis import Redis



async def get_redis_connection(request: Request) -> AsyncGenerator[Redis, None]:
    """Get redis client.

    This dependency aquires connection from pool.

    :param request: current request.

    :yield: redis client.
    """
    return request.app.state.redis