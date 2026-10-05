from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class FaceRegisterRequest(BaseModel):
    student_id: int
    images: List[str]  # base64 encoded images


class FaceRegisterResponse(BaseModel):
    success: bool
    encodings_saved: int
    warnings: Optional[List[str]] = []
    error: Optional[str] = None


class FaceProfileResponse(BaseModel):
    student_id: int
    face_registered: bool
    sample_count: int
    registered_at: Optional[datetime]
    is_active: bool
