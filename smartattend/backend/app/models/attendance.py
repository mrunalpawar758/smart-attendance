from sqlalchemy import (
    Column, Integer, String, ForeignKey, Boolean, DateTime, Date,
    Enum, Float, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class AttendanceMethod(str, enum.Enum):
    FACE = "FACE"
    MANUAL = "MANUAL"
    HYBRID = "HYBRID"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"


class SessionStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_code = Column(String(100), unique=True, nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    lecture_number = Column(Integer, default=1)
    method = Column(Enum(AttendanceMethod), nullable=False, default=AttendanceMethod.MANUAL)
    status = Column(Enum(SessionStatus), default=SessionStatus.OPEN)
    notes = Column(Text, nullable=True)
    total_students = Column(Integer, default=0)
    present_count = Column(Integer, default=0)
    absent_count = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    teacher = relationship("Teacher", back_populates="attendance_sessions")
    class_ = relationship("Class", back_populates="attendance_sessions")
    subject = relationship("Subject", back_populates="attendance_sessions")
    records = relationship("AttendanceRecord", back_populates="session", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("class_id", "subject_id", "date", "lecture_number", name="uq_session"),
        Index("idx_session_date", "date"),
        Index("idx_session_class_subject", "class_id", "subject_id"),
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.ABSENT)
    method = Column(Enum(AttendanceMethod), nullable=False, default=AttendanceMethod.MANUAL)
    confidence_score = Column(Float, nullable=True)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")
    subject = relationship("Subject")
    class_ = relationship("Class")
    marked_by_user = relationship("User", foreign_keys=[marked_by])
    audit_logs = relationship("AttendanceAuditLog", back_populates="record", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_record"),
        Index("idx_record_student_date", "student_id", "date"),
        Index("idx_record_subject", "subject_id"),
    )


class AttendanceAuditLog(Base):
    __tablename__ = "attendance_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    previous_status = Column(Enum(AttendanceStatus), nullable=True)
    new_status = Column(Enum(AttendanceStatus), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    record = relationship("AttendanceRecord", back_populates="audit_logs")
    student = relationship("Student")
    changed_by_user = relationship("User", foreign_keys=[changed_by])
