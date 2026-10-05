from sqlalchemy.orm import Session
from app.models.settings import SystemSettings
from app.config import settings as app_settings
from typing import Dict, Any


DEFAULT_SETTINGS = {
    "attendance_threshold": "75.0",
    "face_recognition_threshold": "0.55",
    "institution_name": "SmartAttend Institute",
    "academic_year": "2025-2026",
    "working_days_per_week": "6",
    "session_duration_minutes": "60",
    "face_recognition_enabled": "true",
    "liveness_detection_enabled": "false",
    "data_retention_days": "365",
}


def get_setting(db: Session, key: str) -> str:
    row = db.query(SystemSettings).filter(SystemSettings.key == key).first()
    if row:
        return row.value
    return DEFAULT_SETTINGS.get(key, "")


def get_all_settings(db: Session) -> Dict[str, str]:
    rows = db.query(SystemSettings).all()
    result = {**DEFAULT_SETTINGS}
    for row in rows:
        result[row.key] = row.value
    return result


def set_setting(db: Session, key: str, value: str, user_id: int = None):
    row = db.query(SystemSettings).filter(SystemSettings.key == key).first()
    if row:
        row.value = value
        row.updated_by = user_id
    else:
        row = SystemSettings(key=key, value=value, updated_by=user_id)
        db.add(row)
    db.commit()
    return row


def get_attendance_threshold(db: Session) -> float:
    val = get_setting(db, "attendance_threshold")
    try:
        return float(val)
    except Exception:
        return 75.0


def get_face_threshold(db: Session) -> float:
    val = get_setting(db, "face_recognition_threshold")
    try:
        return float(val)
    except Exception:
        return 0.55
