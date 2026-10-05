from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text, Boolean, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class FaceProfile(Base):
    __tablename__ = "face_profiles"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False)
    # JSON-serialized face encodings (list of 128-dim vectors)
    encodings_json = Column(Text, nullable=False)
    sample_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    registered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("Student", back_populates="face_profile")
    registered_by_user = relationship("User", foreign_keys=[registered_by])
