from fastapi import FastAPI
from sqlalchemy import text
from app.database import engine
from routes import services, incidents, chaos_experiments, cost_reports
from app.aws_scanner import run_full_scan
from app.secret_scanner import scan_directory

app = FastAPI(title="Nexus AI Backend")

app.include_router(services.router)
app.include_router(incidents.router)
app.include_router(chaos_experiments.router)
app.include_router(cost_reports.router)


@app.get("/")
def read_root():
    return {"message": "Nexus AI backend is running"}


@app.get("/db-check")
def db_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"database": "connected successfully"}


@app.get("/aws-scan")
def aws_scan():
    return run_full_scan()


@app.get("/secret-scan")
def secret_scan():
    return scan_directory("/home/twinkle_14/projects/nexus-ai")
