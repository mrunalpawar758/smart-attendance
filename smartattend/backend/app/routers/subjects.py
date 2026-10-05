from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.auth.dependencies import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


def enrich(s: Subject) -> SubjectResponse:
    return SubjectResponse(
        id=s.id, name=s.name, code=s.code, description=s.description,
        department_id=s.department_id,
        department_name=s.department.name if s.department else None,
        class_id=s.class_id,
        class_name=s.class_.name if s.class_ else None,
        credits=s.credits, is_active=s.is_active, created_at=s.created_at,
    )


@router.get("", response_model=List[SubjectResponse])
def list_subjects(
    class_id: Optional[int] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Subject)
    if class_id:
        q = q.filter(Subject.class_id == class_id)
    if department_id:
        q = q.filter(Subject.department_id == department_id)
    return [enrich(s) for s in q.order_by(Subject.name).all()]


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(subject_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")
    return enrich(s)


@router.post("", response_model=SubjectResponse)
def create_subject(
    data: SubjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(Subject).filter(Subject.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")
    s = Subject(**data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return enrich(s)


@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    data: SubjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return enrich(s)


@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")
    s.is_active = False
    db.commit()
    return {"message": "Subject deactivated"}


@router.post("/{subject_id}/assign-teacher/{teacher_id}")
def assign_teacher(
    subject_id: int,
    teacher_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from app.models.teacher import Teacher
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    t = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not s or not t:
        raise HTTPException(status_code=404, detail="Subject or Teacher not found")
    if t not in s.teachers:
        s.teachers.append(t)
        db.commit()
    return {"message": "Teacher assigned to subject"}
