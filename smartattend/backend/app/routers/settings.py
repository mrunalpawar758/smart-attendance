from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict

from app.database import get_db
from app.models.user import User
from app.auth.dependencies import require_admin, get_current_user
from app.services.settings_service import get_all_settings, set_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])


class UpdateSettingRequest(BaseModel):
    value: str


@router.get("")
def get_settings(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return get_all_settings(db)


@router.put("/{key}")
def update_setting(
    key: str,
    data: UpdateSettingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    allowed_keys = {
        "attendance_threshold", "face_recognition_threshold",
        "institution_name", "academic_year", "working_days_per_week",
        "session_duration_minutes", "face_recognition_enabled",
        "liveness_detection_enabled", "data_retention_days",
    }
    if key not in allowed_keys:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown setting key: {key}")
    set_setting(db, key, data.value, current_user.id)
    return {"key": key, "value": data.value, "message": "Setting updated"}


@router.put("")
def bulk_update_settings(
    data: Dict[str, str],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    for k, v in data.items():
        set_setting(db, k, v, current_user.id)
    return {"message": "Settings updated", "count": len(data)}
