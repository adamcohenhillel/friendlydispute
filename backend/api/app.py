"""
"""
from fastapi import FastAPI
from fastapi.responses import UJSONResponse
from fastapi.routing import APIRouter

from api.exception_handlers import register_exception_handlers
from api.lifetime import register_shutdown_event, register_startup_event
from api.routes.dispute import dispute_router


def get_app() -> FastAPI:
    """Get API app
    """
    app = FastAPI(
        title="Friendly Dispute.",
        description="Skip this for now",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        default_response_class=UJSONResponse,
        debug=True
    )
    
    # Adds startup and shutdown events.
    register_startup_event(app)
    register_shutdown_event(app)
    register_exception_handlers(app)

    api_router = APIRouter()
    api_router.include_router(dispute_router, prefix='/dispute', tags=['users'])

    app.include_router(router=api_router, prefix='/api')

    return app
