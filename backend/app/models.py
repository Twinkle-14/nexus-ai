from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    region = Column(String, nullable=False)
    status = Column(String, default="healthy")
    endpoint_url = Column(String, nullable=True)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    severity = Column(String, default="medium")
    description = Column(String, nullable=False)
    root_cause = Column(String, nullable=True)
    status = Column(String, default="open")

class ChaosExperiment(Base):
    __tablename__ = "chaos_experiments"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    failure_type = Column(String, nullable=False)
    result = Column(String, default="pending")
    notes = Column(String, nullable=True)


class CostReport(Base):
    __tablename__ = "cost_reports"

    id = Column(Integer, primary_key=True, index=True)
    resource_name = Column(String, nullable=False)
    monthly_cost = Column(Integer, nullable=False)
    recommendation = Column(String, nullable=True)
    potential_savings = Column(Integer, nullable=True)
