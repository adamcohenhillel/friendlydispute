"""
"""
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings.
    """
    # Databases:
    redis_url: str = 'redis://localhost:6379/0'


settings = Settings()
