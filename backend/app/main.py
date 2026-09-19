from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .core.config import settings
from .core.logging import setup_logging, logger
from .api.v1 import api_v1_router

setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SatQuery AI Remote-Sensing Image Intelligence API Gateway",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS for frontend origin (e.g. http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Format HTTP exceptions into structured error envelope."""
    if isinstance(exc.detail, dict) and "code" in exc.detail and "message" in exc.detail:
        error_content = exc.detail
    else:
        error_content = {
            "code": "HTTP_ERROR",
            "message": str(exc.detail),
            "details": None
        }
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": error_content}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format Pydantic / FastAPI request validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload.",
                "details": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all unexpected internal server error handler."""
    logger.exception("Unhandled server exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred."
            }
        }
    )


from .services.inference_service import inference_orchestrator


@app.get("/health", tags=["System"])
async def health_check():
    """System health check and operational telemetry."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "inference_mode": settings.INFERENCE_MODE
    }


@app.get("/health/inference", tags=["System"])
async def inference_health_check():
    """Check status of the active inference orchestrator, adapter, and remote worker."""
    adapter_info = inference_orchestrator.get_adapter_info()
    health_status = await inference_orchestrator.check_health()
    return {
        "status": "healthy" if health_status.get("reachable") else "degraded",
        "inference_mode": settings.INFERENCE_MODE,
        "adapter": adapter_info["adapter"],
        "is_colab": adapter_info["is_colab"],
        "colab_configured": adapter_info["colab_url_configured"],
        "remote_worker": health_status
    }


# Mount API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
