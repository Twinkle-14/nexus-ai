from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ChaosExperiment
from app.schemas import ChaosExperimentCreate, ChaosExperimentResponse
from app.chaos_engine import run_pod_kill

router = APIRouter(prefix="/chaos-experiments", tags=["Chaos Experiments"])


@router.post("/", response_model=ChaosExperimentResponse)
def create_experiment(experiment: ChaosExperimentCreate, db: Session = Depends(get_db)):
    new_experiment = ChaosExperiment(**experiment.dict())
    db.add(new_experiment)
    db.commit()
    db.refresh(new_experiment)
    return new_experiment


@router.get("/", response_model=list[ChaosExperimentResponse])
def list_experiments(db: Session = Depends(get_db)):
    return db.query(ChaosExperiment).all()


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
    for key, value in updated.dict().items():
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
    result = run_pod_kill(target_deployment)

    experiment = ChaosExperiment(
        service_id=1,
        failure_type="pod-kill",
        result="triggered",
        notes=f"Targeted deployment: {target_deployment}"
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)

    return {"chaos_mesh_result": result, "saved_record": experiment}
