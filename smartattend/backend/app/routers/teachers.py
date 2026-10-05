from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse
from app.auth.dependencies import require_admin, get_current_user
from app.auth.security import hash_password

router = APIRouter(prefix="/api/teachers", tags=["teachers"])


def build_response(t: Teacher) -> TeacherResponse:
    return TeacherResponse(
        id=t.id,
        user_id=t.user_id,
        teacher_id=t.teacher_id,
        full_name=t.user.full_name,
        email=t.user.email,
        phone=t.user.phone,
        department_id=t.department_id,
        department_name=t.department.name if t.department else None,
        designation=t.designation,
        qualification=t.qualification,
        is_active=t.is_active,
        subject_count=len(t.subjects),
        created_at=t.created_at,
    )


@router.get("", response_model=List[TeacherResponse])
def list_teachers(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Teacher).join(User, Teacher.user_id == User.id)
    if search:
        q = q.filter(
            (User.full_name.ilike(f"%{search}%"))
            | (Teacher.teacher_id.ilike(f"%{search}%"))
        )
    if department_id:
        q = q.filter(Teacher.department_id == department_id)
    return [build_response(t) for t in q.all()]


@router.get("/{teacher_id}", response_model=TeacherResponse)
def get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    t = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return build_response(t)


@router.get("/{teacher_id}/subjects")
def get_teacher_subjects(
    teacher_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    t = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return [
        {"id": s.id, "name": s.name, "code": s.code, "class_id": s.class_id, "class_name": s.class_.name if s.class_ else None}
        for s in t.subjects
    ]


@router.post("", response_model=TeacherResponse)
def create_teacher(
    data: TeacherCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Teacher).filter(Teacher.teacher_id == data.teacher_id).first():
        raise HTTPException(status_code=400, detail="Teacher ID already exists")

    username = data.email.split("@")[0]
    base = username
    i = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base}{i}"
        i += 1

    user = User(
        email=data.email,
        username=username,
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.TEACHER,
        hashed_password=hash_password("Teacher@123"),
    )
    db.add(user)
    db.flush()

    teacher = Teacher(
        user_id=user.id,
        teacher_id=data.teacher_id,
        department_id=data.department_id,
        designation=data.designation,
        qualification=data.qualification,
    )
    db.add(teacher)
    db.flush()

    if data.subject_ids:
        subjects = db.query(Subject).filter(Subject.id.in_(data.subject_ids)).all()
        teacher.subjects = subjects

    db.commit()
    db.refresh(teacher)
    return build_response(teacher)


@router.put("/{teacher_id}", response_model=TeacherResponse)
def update_teacher(
    teacher_id: int,
    data: TeacherUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    t = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Teacher not found")

    update_data = data.model_dump(exclude_none=True)
    subject_ids = update_data.pop("subject_ids", None)

    for k in ["full_name", "phone"]:
        if k in update_data:
            setattr(t.user, k, update_data.pop(k))

    for k, v in update_data.items():
        if k == "is_active":
            t.is_active = v
            t.user.is_active = v
        else:
            setattr(t, k, v)

    if subject_ids is not None:
        subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
        t.subjects = subjects

    db.commit()
    db.refresh(t)
    return build_response(t)


@router.delete("/{teacher_id}")
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    t = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Teacher not found")
    t.is_active = False
    t.user.is_active = False
    db.commit()
    return {"message": "Teacher deactivated"}
