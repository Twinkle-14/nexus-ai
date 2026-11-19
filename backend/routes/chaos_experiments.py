from fastapi import APIRouter, Depends, HTTPException
from kubernetes.client.exceptions import ApiException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChaosExperiment, Service, Incident
from app.schemas import ChaosExperimentCreate, ChaosExperimentResponse
from app.chaos_engine import get_demo_web_app_status, run_pod_kill

router = APIRouter(prefix="/chaos-experiments", tags=["Chaos Experiments"])
DEMO_NAME = "demo-web-app"
DEMO_REGION = "minikube-local"
DEMO_ENDPOINT = "http://127.0.0.1:8088"


def _dump_model(model):
    return model.model_dump() if hasattr(model, "model_dump") else model.dict()


def _get_or_create_demo_service(db: Session) -> Service:
    """Keep Chaos Lab history attached to its own local demo record, never a region service."""
    service = db.query(Service).filter(Service.name == DEMO_NAME, Service.region == DEMO_REGION).first()
    if service is None:
        service = Service(
            name=DEMO_NAME,
            region=DEMO_REGION,
            status="healthy",
            endpoint_url=DEMO_ENDPOINT,
        )
        db.add(service)
        db.commit()
        db.refresh(service)
    return service


@router.post("/", response_model=ChaosExperimentResponse)
def create_experiment(experiment: ChaosExperimentCreate, db: Session = Depends(get_db)):
    new_experiment = ChaosExperiment(**_dump_model(experiment))
    db.add(new_experiment)
    db.commit()
    db.refresh(new_experiment)
    return new_experiment


@router.get("/")
def list_experiments(db: Session = Depends(get_db)):
    rows = db.query(ChaosExperiment).order_by(ChaosExperiment.id.desc()).all()
    # Preserve general API history, while exposing a convenient target label for the UI.
    return rows


@router.get("/demo/status")
def demo_app_status():
    try:
        return get_demo_web_app_status()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ApiException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not read the Minikube state (Kubernetes API HTTP {exc.status}).",
        ) from exc


@router.get("/{experiment_id}", response_model=ChaosExperimentResponse)
def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(ChaosExperiment).filter(ChaosExperiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment


@router.put("/{experiment_id}", response_model=ChaosExperimentResponse)
def update_experiment(experiment_id: int, updated: ChaosExperimentCreate, db: Session = Depends(get_db)):
    experiment = db.query(ChaosExperiment).filter(ChaosExperiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    for key, value in _dump_model(updated).items():
        setattr(experiment, key, value)
    db.commit()
    db.refresh(experiment)
    return experiment


@router.delete("/{experiment_id}")
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(ChaosExperiment).filter(ChaosExperiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    db.delete(experiment)
    db.commit()
    return {"message": "Experiment deleted"}


@router.post("/run/{target_deployment}")
def run_experiment(target_deployment: str, db: Session = Depends(get_db)):
    # This demo build deliberately restricts Chaos Lab to the isolated Minikube app.
    if target_deployment != DEMO_NAME:
        raise HTTPException(status_code=400, detail="Chaos Lab can target only demo-web-app in the default namespace.")

    service = _get_or_create_demo_service(db)
    try:
        result = run_pod_kill(DEMO_NAME, "default")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ApiException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Kubernetes/Chaos Mesh rejected the experiment (HTTP {exc.status}).",
        ) from exc

    experiment = ChaosExperiment(
        service_id=service.id,
        failure_type="pod-kill",
        result="triggered",
        notes=(
            f"Targeted deployment: {DEMO_NAME}; namespace: default; "
            f"selector: app={DEMO_NAME}; Chaos Mesh experiment: {result['experiment_name']}"
        ),
    )
    incident = Incident(
        service_id=service.id,
        severity="high",
        status="open",
        description=(
            f"Chaos Mesh injected a one-pod kill into {DEMO_NAME}. "
            f"Experiment {result['experiment_name']}. Investigate the pod replacement and Prometheus signals."
        ),
    )
    db.add(experiment)
    db.add(incident)
    db.commit()
    db.refresh(experiment)
    db.refresh(incident)
    return {
        "chaos_mesh_result": result,
        "saved_record": experiment,
        "incident_created": {"id": incident.id, "service_id": incident.service_id, "severity": incident.severity},
    }
