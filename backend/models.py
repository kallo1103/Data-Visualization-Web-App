from sqlalchemy import Column, Integer, String, DateTime, JSON, Float, Text
from sqlalchemy.sql import func
from database import Base

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, index=True, nullable=True)
    filename = Column(String, index=True)
    file_path = Column(String)
    file_size = Column(Integer, nullable=True) # bytes
    
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="PENDING") # PENDING, PROCESSING, COMPLETED, FAILED
    
    # Store entire JSON analysis result here
    analysis_data = Column(JSON, nullable=True)
    
    # Store error if any
    error_message = Column(Text, nullable=True)

