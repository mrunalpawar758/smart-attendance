from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.class_model import Class
from app.models.department import Department
from app.models.associations import student_classes
from app.schemas.class_schema import ClassCreate, ClassUpdate, ClassResponse
from app.auth.dependencies import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/classes", tags=["classes"])


def enrich_class(c: Class, db: Session) -> ClassResponse:
    student_count = db.execute(
        student_classes.select().where(student_classes.c.class_id == c.id)
    ).rowcount
    # simpler count
    from sqlalchemy import func, select
    cnt = db.execute(
        select(func.count()).select_from(student_classes).where(student_classes.c.class_id == c.id)
    ).scalar()
    return ClassResponse(
        id=c.id, name=c.name, code=c.code, year=c.year, division=c.division,
        semester=c.semester, department_id=c.department_id,
        department_name=c.department.name if c.department else None,
        is_active=c.is_active, student_count=cnt or 0,
        description=getattr(c, "description", None),
        created_at=c.created_at,
    )


@router.get("", response_model=List[ClassResponse])
def list_classes(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    classes = db.query(Class).order_by(Class.name).all()
    return [enrich_class(c, db) for c in classes]


@router.get("/{class_id}", response_model=ClassResponse)
def get_class(class_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Class).filter(Class.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    return enrich_class(c, db)


@router.post("", response_model=ClassResponse)
def create_class(
    data: ClassCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(Class).filter(Class.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Class code already exists")
    c = Class(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return enrich_class(c, db)


@router.put("/{class_id}", response_model=ClassResponse)
def update_class(
    class_id: int,
    data: ClassUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    c = db.query(Class).filter(Class.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return enrich_class(c, db)


@router.delete("/{class_id}")
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    c = db.query(Class).filter(Class.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    c.is_active = False
    db.commit()
    return {"message": "Class deactivated"}


@router.post("/{class_id}/students/{student_id}")
def assign_student_to_class(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from app.models.student import Student
    c = db.query(Class).filter(Class.id == class_id).first()
    s = db.query(Student).filter(Student.id == student_id).first()
    if not c or not s:
        raise HTTPException(status_code=404, detail="Class or student not found")
    if s not in c.students:
        c.students.append(s)
        db.commit()
    return {"message": "Student assigned to class"}


@router.get("/{class_id}/students")
def get_class_students(
    class_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.student import Student
    c = db.query(Class).filter(Class.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    students = c.students
    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "roll_number": s.roll_number,
            "full_name": s.user.full_name,
            "email": s.user.email,
            "face_registered": s.face_registered,
        }
        for s in students
    ]
