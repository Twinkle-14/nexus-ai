"""Incident CRUD and one-click scan + AI root-cause workflow."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Incident, Service
from app.schemas import IncidentCreate, IncidentResponse
from app.ai_engine import analyze_incident
from app.prometheus_client import get_real_metrics_summary
from app.demo_mode import require_local_cluster

router = APIRouter(prefix="/incidents", tags=["Incidents"])
LEGACY_PAYMENT_PLACEHOLDER = "Payment API returning 500 errors intermittently"


def _dump_model(model):
    return model.model_dump() if hasattr(model, "model_dump") else model.dict()


def _run_analysis(incident: Incident, db: Session):
    require_local_cluster("AI Root Cause Analysis")
    metrics = get_real_metrics_summary("demo-web-app")
    try:
        ai_result = analyze_incident(
            description=incident.description,
            error_rate_before="not collected",
            error_rate_after="not collected",
            latency_before="not collected",
            latency_after="not collected",
            notes=(
                f"Prometheus telemetry snapshot: {metrics}. "
                "Interpretation rules: deployment_pods contains demo-web-app pod counts; "
                "pod_restarts is a cumulative container restart count; cluster_health counts "
                "Prometheus scrape targets, not Kubernetes pods. Never treat target-down "
                "counts as pod failures. If a field contains an error, call it unavailable. "
                "Do not invent historical changes, logs, HTTP errors, or timings."
            ),
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=(
                "The incident was scanned, but the AI report could not be generated. "
                "Check Ollama and the configured model. "
                f"Cause: {type(exc).__name__}"
            ),
        ) from exc

    incident.root_cause = ai_result["ai_response"]
    db.commit()
    db.refresh(incident)

    available_metric_groups = [
        name for name, value in metrics.items()
        if not (isinstance(value, dict) and value.get("error"))
    ]
    unavailable_metric_groups = [
        name for name, value in metrics.items()
        if isinstance(value, dict) and value.get("error")
    ]
    if len(available_metric_groups) == len(metrics):
        metrics_status = "connected"
    elif available_metric_groups:
        metrics_status = "partial"
    else:
        metrics_status = "unavailable"

    return {
        "incident_id": incident.id,
        "description": incident.description,
        "severity": incident.severity,
        "service_id": incident.service_id,
        "ai_analysis": ai_result["ai_response"],
        "model": ai_result.get("model"),
        "metrics_used": metrics,
        "metrics_status": metrics_status,
        "available_metric_groups": available_metric_groups,
        "unavailable_metric_groups": unavailable_metric_groups,
        "investigation_status": "completed",
    }


@router.post("/", response_model=IncidentResponse)
def create_incident(incident: IncidentCreate, db: Session = Depends(get_db)):
    new_incident = Incident(**_dump_model(incident))
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    return new_incident


@router.get("/", response_model=list[IncidentResponse])
def list_incidents(db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.id.desc()).all()


@router.delete("/demo-payment-placeholder")
def delete_legacy_payment_placeholder(db: Session = Depends(get_db)):
    """Delete only the known fake Payment API seed incident; never real incidents."""
    deleted = (
        db.query(Incident)
        .filter(func.lower(Incident.description) == LEGACY_PAYMENT_PLACEHOLDER.lower())
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"deleted_count": deleted, "message": "Legacy demo placeholder cleanup complete"}


@router.post("/scan-and-investigate")
def scan_and_investigate(incident: IncidentCreate, db: Session = Depends(get_db)):
    """Create the incident, collect telemetry, and return its AI report in one request."""
    require_local_cluster("AI Root Cause Analysis")
    service = db.query(Service).filter(Service.id == incident.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Selected application was not found")
    if service.name.strip().lower() != "demo-web-app":
        raise HTTPException(
            status_code=400,
            detail="AI Root Cause currently supports the isolated demo-web-app workload only.",
        )

    new_incident = Incident(**_dump_model(incident))
    db.add(new_incident)
    try:
        db.flush()
        return _run_analysis(new_incident, db)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.put("/{incident_id}", response_model=IncidentResponse)
def update_incident(incident_id: int, updated: IncidentCreate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    for key, value in _dump_model(updated).items():
        setattr(incident, key, value)
    db.commit()
    db.refresh(incident)
    return incident


@router.delete("/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
    return {"message": "Incident deleted"}


@router.post("/{incident_id}/investigate")
def investigate_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _run_analysis(incident, db)
