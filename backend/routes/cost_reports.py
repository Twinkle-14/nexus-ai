from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CostReport
from app.schemas import CostReportCreate, CostReportResponse

router = APIRouter(prefix="/cost-reports", tags=["Cost Reports"])


@router.post("/", response_model=CostReportResponse)
def create_report(report: CostReportCreate, db: Session = Depends(get_db)):
    new_report = CostReport(**report.dict())
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report


@router.get("/", response_model=list[CostReportResponse])
def list_reports(db: Session = Depends(get_db)):
    return db.query(CostReport).all()


@router.get("/{report_id}", response_model=CostReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(CostReport).filter(CostReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.put("/{report_id}", response_model=CostReportResponse)
def update_report(report_id: int, updated: CostReportCreate, db: Session = Depends(get_db)):
    report = db.query(CostReport).filter(CostReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    for key, value in updated.dict().items():
        setattr(report, key, value)
    db.commit()
    db.refresh(report)
    return report


@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(CostReport).filter(CostReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report deleted"}
