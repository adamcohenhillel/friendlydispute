"""
"""
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings.

    # these parameters can be configured with environment variables.
    """

    host: str = '127.0.0.1'
    port: int = 8000
    workers_count: int = 1  # quantity of workers for uvicorn
    reload: bool = False  # Enable uvicorn reloading
    
    environment: str = 'dev'

    # Databases:
    redis_url: str = 'redis://localhost:6379/0'


settings = Settings()
