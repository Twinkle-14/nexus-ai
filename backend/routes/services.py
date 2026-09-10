from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Service
from app.schemas import ServiceCreate, ServiceResponse
from app.failover_engine import simulate_failure, run_failover, recover_primary

router = APIRouter(prefix="/services", tags=["Services"])


@router.post("/", response_model=ServiceResponse)
def create_service(service: ServiceCreate, db: Session = Depends(get_db)):
    new_service = Service(**service.dict())
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return new_service


@router.get("/", response_model=list[ServiceResponse])
def list_services(db: Session = Depends(get_db)):
    return db.query(Service).all()


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(service_id: int, updated: ServiceCreate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    for key, value in updated.dict().items():
        setattr(service, key, value)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(service)
    db.commit()
    return {"message": "Service deleted"}


@router.post("/failover/simulate/{primary_id}")
def simulate_failure_endpoint(primary_id: int, db: Session = Depends(get_db)):
    return simulate_failure(primary_id, db)


@router.post("/failover/run/{primary_id}/{backup_id}")
def run_failover_endpoint(primary_id: int, backup_id: int, db: Session = Depends(get_db)):
    return run_failover(primary_id, backup_id, db)


@router.post("/failover/recover/{primary_id}/{backup_id}")
def recover_primary_endpoint(primary_id: int, backup_id: int, db: Session = Depends(get_db)):
    return recover_primary(primary_id, backup_id, db)
