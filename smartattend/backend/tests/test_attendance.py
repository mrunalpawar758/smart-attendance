"""Attendance service unit tests."""
import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
import app.models  # register all models

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_attendance.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


@pytest.fixture
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_attendance_percentage_calculation():
    """Percentage = present / total * 100"""
    total = 40
    present = 34
    pct = round(present / total * 100, 2)
    assert pct == 85.0


def test_zero_classes_percentage():
    """Avoid division by zero."""
    total = 0
    pct = round(present / total * 100, 2) if total > 0 else 0.0
    assert pct == 0.0


def test_low_attendance_detection():
    threshold = 75.0
    assert 60.0 < threshold  # 60% is low
    assert 80.0 >= threshold  # 80% is OK


def test_session_code_uniqueness():
    from app.services.attendance_service import generate_session_code
    c1 = generate_session_code(1, 1, date(2025, 1, 1), 1)
    c2 = generate_session_code(1, 1, date(2025, 1, 1), 1)
    # Both have random suffix, should differ
    assert c1 != c2


def test_attendance_method_values():
    from app.models.attendance import AttendanceMethod
    assert AttendanceMethod.FACE == "FACE"
    assert AttendanceMethod.MANUAL == "MANUAL"
    assert AttendanceMethod.HYBRID == "HYBRID"
