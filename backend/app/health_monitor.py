"""Optional service health monitor.

Monitoring is disabled by default. Configure ENABLE_HEALTH_MONITOR=true and
MONITORED_PAIRS=1:2,3:4 in backend/.env to enable it. Automatic database
failover promotion additionally requires ENABLE_AUTOMATIC_FAILOVER=true.
"""

import os
import threading
import time

import requests
from app.database import SessionLocal
from app.failover_engine import run_failover
from app.models import Service

CHECK_INTERVAL_SECONDS = max(5, int(os.getenv("HEALTH_CHECK_INTERVAL_SECONDS", "15")))
_STOP_EVENT = threading.Event()
_THREAD: threading.Thread | None = None


def _enabled(name: str) -> bool:
    return os.getenv(name, "false").strip().lower() in {"1", "true", "yes"}


def _monitored_pairs() -> list[tuple[int, int]]:
    raw = os.getenv("MONITORED_PAIRS", "")
    pairs: list[tuple[int, int]] = []
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        try:
            primary, backup = item.split(":", 1)
            primary_id, backup_id = int(primary), int(backup)
            if primary_id != backup_id:
                pairs.append((primary_id, backup_id))
        except ValueError:
            print(f"[health-monitor] Ignoring invalid MONITORED_PAIRS entry: {item!r}")
    return pairs


def check_and_update(db, service: Service) -> bool | None:
    """Return True/False for endpoint health; None when no URL is configured."""
    if not service.endpoint_url:
        return None
    try:
        response = requests.get(service.endpoint_url, timeout=3)
        healthy = 200 <= response.status_code < 400
    except requests.RequestException:
        healthy = False

    new_status = "healthy" if healthy else "unhealthy"
    # An active primary must still be demoted when its endpoint goes unhealthy;
    # otherwise the monitor would detect the outage but the promotion guard would not run.
    if service.status != new_status and (service.status != "active-primary" or not healthy):
        service.status = new_status
        db.commit()
        db.refresh(service)
    return healthy


def monitor_loop() -> None:
    pairs = _monitored_pairs()
    while not _STOP_EVENT.is_set():
        db = SessionLocal()
        try:
            for primary_id, backup_id in pairs:
                primary = db.query(Service).filter(Service.id == primary_id).first()
                backup = db.query(Service).filter(Service.id == backup_id).first()
                if not primary or not backup:
                    continue

                primary_health = check_and_update(db, primary)
                backup_health = check_and_update(db, backup)

                if (
                    primary_health is False
                    and backup_health is True
                    and _enabled("ENABLE_AUTOMATIC_FAILOVER")
                    and backup.status != "active-primary"
                ):
                    print(
                        f"[health-monitor] {primary.region} is unhealthy; "
                        f"promoting configured backup {backup.region}."
                    )
                    run_failover(primary_id, backup_id, db)
        except Exception as exc:
            db.rollback()
            print(f"[health-monitor] Check failed: {type(exc).__name__}: {exc}")
        finally:
            db.close()
        _STOP_EVENT.wait(CHECK_INTERVAL_SECONDS)


def start_monitor() -> None:
    global _THREAD
    if not _enabled("ENABLE_HEALTH_MONITOR"):
        print("[health-monitor] Disabled (set ENABLE_HEALTH_MONITOR=true to enable).")
        return
    if not _monitored_pairs():
        print("[health-monitor] No MONITORED_PAIRS configured; monitor not started.")
        return
    if _THREAD and _THREAD.is_alive():
        return
    _STOP_EVENT.clear()
    _THREAD = threading.Thread(target=monitor_loop, name="nexus-health-monitor", daemon=True)
    _THREAD.start()
    print("[health-monitor] Started.")


def stop_monitor() -> None:
    _STOP_EVENT.set()
    if _THREAD and _THREAD.is_alive():
        _THREAD.join(timeout=2)
