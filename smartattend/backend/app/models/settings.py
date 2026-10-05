from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by = Column(Integer, nullable=True)

    # Predefined settings keys:
    # attendance_threshold -> float (e.g. 75.0)
    # face_recognition_threshold -> float (e.g. 0.55)
    # institution_name -> string
    # academic_year -> string
    # working_days_per_week -> int
    # session_duration_minutes -> int
    # face_recognition_enabled -> bool
    # liveness_detection_enabled -> bool
    # data_retention_days -> int
