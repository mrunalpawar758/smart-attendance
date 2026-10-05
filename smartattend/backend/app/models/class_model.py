from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.associations import student_classes


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False)
    year = Column(Integer, nullable=False)
    division = Column(String(10), nullable=True)
    semester = Column(Integer, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    department = relationship("Department", back_populates="classes")
    students = relationship("Student", secondary=student_classes, back_populates="classes")
    attendance_sessions = relationship("AttendanceSession", back_populates="class_", lazy="dynamic")
    subjects = relationship("Subject", back_populates="class_", lazy="dynamic")
