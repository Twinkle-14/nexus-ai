from sqlalchemy.orm import Session
from app.models import Service
import time


def simulate_failure(primary_id: int, db: Session):
    """
    Simulates the primary region becoming unhealthy.
    """
    primary = db.query(Service).filter(Service.id == primary_id).first()
    if not primary:
        return {"error": "Primary service not found"}

    primary.status = "unhealthy"
    db.commit()
    db.refresh(primary)

    return {"message": f"{primary.region} marked as unhealthy", "service": primary}


def run_failover(primary_id: int, backup_id: int, db: Session):
    """
    Checks primary health. If unhealthy, promotes the backup to active
    and logs how long the "failover" took.
    """
    start_time = time.time()

    primary = db.query(Service).filter(Service.id == primary_id).first()
    backup = db.query(Service).filter(Service.id == backup_id).first()

    if not primary or not backup:
        return {"error": "One or both services not found"}

    if primary.status == "unhealthy":
        backup.status = "active-primary"
        db.commit()
        db.refresh(backup)

        elapsed = round(time.time() - start_time, 2)

        return {
            "failover_triggered": True,
            "previous_primary": {"region": primary.region, "status": primary.status},
            "new_active": {"region": backup.region, "status": backup.status},
            "failover_time_seconds": elapsed,
        }

    return {
        "failover_triggered": False,
        "message": f"{primary.region} is healthy, no failover needed",
    }


def recover_primary(primary_id: int, backup_id: int, db: Session):
    """
    Restores the original primary back to healthy/active,
    and returns the backup to standby.
    """
    primary = db.query(Service).filter(Service.id == primary_id).first()
    backup = db.query(Service).filter(Service.id == backup_id).first()

    if not primary or not backup:
        return {"error": "One or both services not found"}

    primary.status = "healthy"
    backup.status = "healthy"
    db.commit()
    db.refresh(primary)
    db.refresh(backup)

    return {
        "message": f"{primary.region} restored as primary, {backup.region} returned to standby"
    }
