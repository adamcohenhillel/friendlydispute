"""
"""
from pydantic import BaseModel
from fastapi import APIRouter

from core.nlp import query_openai_for_arbitration
from core.types import Claim

dispute_router = APIRouter()


class DisputeSchema(BaseModel):
    claim_1: Claim
    claim_2: Claim


@dispute_router.post('/{room_uuid}')
async def post(body: DisputeSchema):
    """New arbitration

    :param body: request json parameters
    """
    return await query_openai_for_arbitration(claim_1=body.claim_1, claim_2=body.claim_2)
