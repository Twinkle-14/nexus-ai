from pydantic import BaseModel
from typing import Optional


class ServiceBase(BaseModel):
    name: str
    region: str
    status: Optional[str] = "healthy"
    endpoint_url: Optional[str] = None

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int

    class Config:
        from_attributes = True


class IncidentBase(BaseModel):
    service_id: int
    severity: Optional[str] = "medium"
    description: str
    root_cause: Optional[str] = None
    status: Optional[str] = "open"

class IncidentCreate(IncidentBase):
    pass

class IncidentResponse(IncidentBase):
    id: int

    class Config:
        from_attributes = True


class ChaosExperimentBase(BaseModel):
    service_id: int
    failure_type: str
    result: Optional[str] = "pending"
    notes: Optional[str] = None

class ChaosExperimentCreate(ChaosExperimentBase):
    pass

class ChaosExperimentResponse(ChaosExperimentBase):
    id: int

    class Config:
        from_attributes = True


class CostReportBase(BaseModel):
    resource_name: str
    monthly_cost: int
    recommendation: Optional[str] = None
    potential_savings: Optional[int] = None

class CostReportCreate(CostReportBase):
    pass

class CostReportResponse(CostReportBase):
    id: int

    class Config:
        from_attributes = True
