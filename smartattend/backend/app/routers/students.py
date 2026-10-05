from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.student import Student
from app.models.user import User, UserRole
from app.models.class_model import Class
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.auth.dependencies import require_admin, get_current_user
from app.auth.security import hash_password

router = APIRouter(prefix="/api/students", tags=["students"])


def build_response(s: Student) -> StudentResponse:
    return StudentResponse(
        id=s.id,
        user_id=s.user_id,
        student_id=s.student_id,
        roll_number=s.roll_number,
        full_name=s.user.full_name,
        email=s.user.email,
        phone=s.user.phone,
        department_id=s.department_id,
        department_name=s.department.name if s.department else None,
        year=s.year,
        division=s.division,
        face_registered=s.face_registered,
        is_active=s.is_active,
        profile_photo=s.user.profile_photo,
        created_at=s.created_at,
    )


@router.get("", response_model=List[StudentResponse])
def list_students(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    class_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Student).join(User, Student.user_id == User.id)
    if search:
        q = q.filter(
            (User.full_name.ilike(f"%{search}%"))
            | (Student.student_id.ilike(f"%{search}%"))
            | (Student.roll_number.ilike(f"%{search}%"))
        )
    if department_id:
        q = q.filter(Student.department_id == department_id)
    if class_id:
        from app.models.associations import student_classes
        q = q.join(student_classes, Student.id == student_classes.c.student_id).filter(
            student_classes.c.class_id == class_id
        )
    total = q.count()
    students = q.offset((page - 1) * per_page).limit(per_page).all()
    return [build_response(s) for s in students]


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    return build_response(s)


@router.post("", response_model=StudentResponse)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Check unique email / student_id
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Student).filter(Student.student_id == data.student_id).first():
        raise HTTPException(status_code=400, detail="Student ID already exists")

    # Create user account
    username = data.email.split("@")[0]
    base_username = username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1

    user = User(
        email=data.email,
        username=username,
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.STUDENT,
        hashed_password=hash_password("Student@123"),  # default password
    )
    db.add(user)
    db.flush()

    # Create student record
    student = Student(
        user_id=user.id,
        student_id=data.student_id,
        roll_number=data.roll_number,
        department_id=data.department_id,
        year=data.year,
        division=data.division,
        date_of_birth=data.date_of_birth,
        address=data.address,
        guardian_name=data.guardian_name,
        guardian_phone=data.guardian_phone,
    )
    db.add(student)
    db.flush()

    # Assign to classes
    if data.class_ids:
        classes = db.query(Class).filter(Class.id.in_(data.class_ids)).all()
        student.classes = classes

    db.commit()
    db.refresh(student)
    return build_response(student)


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    data: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = data.model_dump(exclude_none=True)
    class_ids = update_data.pop("class_ids", None)

    # Update user fields
    user_fields = {"full_name", "phone"}
    for k in user_fields:
        if k in update_data:
            setattr(s.user, k, update_data.pop(k))

    # Update student fields
    for k, v in update_data.items():
        if k == "is_active":
            s.is_active = v
            s.user.is_active = v
        else:
            setattr(s, k, v)

    if class_ids is not None:
        classes = db.query(Class).filter(Class.id.in_(class_ids)).all()
        s.classes = classes

    db.commit()
    db.refresh(s)
    return build_response(s)


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    s.is_active = False
    s.user.is_active = False
    db.commit()
    return {"message": "Student deactivated"}
