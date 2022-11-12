"""Types used widely in the codebase
"""
from typing import TypedDict, Union


class OpenAIUsage(TypedDict):
    """OpenAI usage data
    """
    completion_tokens: int
    prompt_tokens: int
    total_tokens: int


class OpenAIChoice(TypedDict):
    """OpenAI Choice
    """
    finish_reason: str
    index: int
    logprobs: Union[None, str]
    text: str


class OpenAIResponse(TypedDict):
    """OpenAI response type
    """
    choices: list[OpenAIChoice]
    created: int
    id: str
    model: str
    object: str
    usage: OpenAIUsage


class Claim(TypedDict):
    person: str
    claim: str


class ArbitrationResult(TypedDict):
    right: str
    reason: str