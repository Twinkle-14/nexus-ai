"""Nexus AI FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
BACKEND_ENV = BACKEND_DIR / ".env"
# Load settings before importing feature modules so all integrations see .env.
load_dotenv(BACKEND_ENV, override=False)

from app.database import Base, engine  # noqa: E402
from app import models  # noqa: F401,E402 - register SQLAlchemy models
from app.health_monitor import start_monitor, stop_monitor  # noqa: E402
from app.aws_scanner import run_full_scan, get_cost_explorer_report  # noqa: E402
from app.secret_scanner import scan_directory  # noqa: E402
from app.demo_mode import block_in_demo  # noqa: E402
from routes import services, incidents, chaos_experiments, cost_reports  # noqa: E402


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create missing tables for a fresh local database. Existing tables/data are kept.
    Base.metadata.create_all(bind=engine)
    start_monitor()
    try:
        yield
    finally:
        stop_monitor()


app = FastAPI(title="Nexus AI Backend", version="1.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(services.router)
app.include_router(incidents.router)
app.include_router(chaos_experiments.router)
app.include_router(cost_reports.router)


@app.get("/")
def read_root():
    return {
        "message": "Nexus AI backend is running",
        "version": app.version,
        "project_root": str(PROJECT_ROOT),
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "nexus-ai-backend"}


@app.get("/db-check")
def db_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"database": "connected", "dialect": engine.dialect.name}
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc.__class__.__name__}") from exc


@app.get("/aws-scan")
def aws_scan():
    block_in_demo("Cost Intelligence", "it would need real AWS credentials, and this public demo does not store any. Run Nexus AI locally with your own AWS account to try it.")
    return run_full_scan()


@app.get("/aws-costs")
def aws_costs(force_refresh: bool = False):
    """Return actual AWS Cost Explorer spend, cached for 15 minutes by default."""
    block_in_demo("Cost Intelligence", "it would need real AWS credentials, and this public demo does not store any. Run Nexus AI locally with your own AWS account to try it.")
    return get_cost_explorer_report(force_refresh=force_refresh)


@app.get("/secret-scan")
def secret_scan():
    return scan_directory(str(PROJECT_ROOT))
