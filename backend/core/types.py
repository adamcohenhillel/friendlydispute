"""Types used widely in the codebase
"""
from typing import TypedDict


class Claim(TypedDict):
    person: str
    claim: str


class ArbitrationResult(TypedDict):
    right: str
    reason: str