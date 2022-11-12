"""
"""
from fastapi import Request
from aioredis import Redis



async def get_redis_connection(request: Request) -> Redis:
    """Get redis client.

    This dependency aquires connection from pool.

    :param request: current request.

    :yield: redis client.
    """
    return request.app.state.redis