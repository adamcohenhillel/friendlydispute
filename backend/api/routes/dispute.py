"""
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from aioredis import Redis

from core.nlp import query_openai_for_arbitration
from core.types import Claim
from api.dependencies import get_redis_connection

dispute_router = APIRouter()


class DisputeSchema(BaseModel):
    claim_1: Claim
    claim_2: Claim


@dispute_router.post('/{room_uuid}')
async def post(
    body: DisputeSchema,
    redis: Redis = Depends(get_redis_connection)
):
    """New arbitration

    :param body: request json parameters
    """
    redis.set('yello', 'bello')
    redis.get('yello')
    return await query_openai_for_arbitration(claim_1=body.claim_1, claim_2=body.claim_2)
