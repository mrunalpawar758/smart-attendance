from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.face_profile import FaceProfile
from app.auth.dependencies import require_teacher, get_current_user, require_admin
from app.face_recognition.service import (
    register_student_face,
    recognize_from_frame,
    FACE_RECOGNITION_AVAILABLE,
)
from app.config import settings

router = APIRouter(prefix="/api/face", tags=["face-recognition"])


class RegisterFaceRequest(BaseModel):
    student_id: int
    images: List[str]  # list of base64-encoded images


class RecognizeRequest(BaseModel):
    session_id: int
    class_id: int
    image_data: str  # base64


@router.get("/status")
def face_recognition_status():
    return {
        "available": FACE_RECOGNITION_AVAILABLE,
        "threshold": settings.FACE_RECOGNITION_THRESHOLD,
        "message": (
            "Face recognition is active"
            if FACE_RECOGNITION_AVAILABLE
            else "face_recognition library not installed. Install dlib + face_recognition to enable."
        ),
    }


@router.post("/register")
def register_face(
    data: RegisterFaceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if len(data.images) < 1:
        raise HTTPException(status_code=400, detail="At least one image required")
    if len(data.images) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed")

    result = register_student_face(
        db=db,
        student_id=data.student_id,
        image_b64_list=data.images,
        registered_by_id=current_user.id,
    )
    if not result["success"]:
        raise HTTPException(status_code=422, detail=result.get("error", "Registration failed"))
    return result


@router.post("/recognize")
def recognize_faces(
    data: RecognizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    from app.config import settings as s
    results = recognize_from_frame(
        db=db,
        image_b64=data.image_data,
        class_id=data.class_id,
        tolerance=s.FACE_RECOGNITION_THRESHOLD,
    )
    return {"results": results, "face_count": len(results)}


@router.get("/profile/{student_id}")
def get_face_profile(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    profile = db.query(FaceProfile).filter(FaceProfile.student_id == student_id).first()
    return {
        "student_id": student_id,
        "face_registered": student.face_registered,
        "sample_count": profile.sample_count if profile else 0,
        "registered_at": profile.registered_at if profile else None,
        "is_active": profile.is_active if profile else False,
    }


@router.delete("/profile/{student_id}")
def delete_face_profile(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    profile = db.query(FaceProfile).filter(FaceProfile.student_id == student_id).first()
    if profile:
        profile.is_active = False
        student.face_registered = False
        db.commit()
    return {"message": "Face profile deactivated"}
