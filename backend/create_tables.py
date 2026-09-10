from app.database import engine, Base
from app.models import Service, Incident, ChaosExperiment, CostReport

Base.metadata.create_all(bind=engine)
print("Tables created successfully")
