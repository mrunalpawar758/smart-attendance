from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceAuditLog, AttendanceStatus
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.attendance import (
    AttendanceSessionCreate, AttendanceSessionResponse, BulkMarkRequest,
    UpdateAttendanceRequest, AttendanceRecordResponse, AttendanceStatsResponse,
)
from app.auth.dependencies import require_teacher, get_current_user
from app.services.attendance_service import (
    create_session, bulk_mark_attendance, close_session,
    get_student_attendance_stats, update_attendance_record, get_class_students
)
from app.services.settings_service import get_attendance_threshold

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def session_to_response(s: AttendanceSession) -> AttendanceSessionResponse:
    return AttendanceSessionResponse(
        id=s.id, session_code=s.session_code, teacher_id=s.teacher_id,
        teacher_name=s.teacher.user.full_name if s.teacher else None,
        class_id=s.class_id,
        class_name=s.class_.name if s.class_ else None,
        subject_id=s.subject_id,
        subject_name=s.subject.name if s.subject else None,
        date=s.date, lecture_number=s.lecture_number,
        method=s.method, status=s.status,
        total_students=s.total_students,
        present_count=s.present_count,
        absent_count=s.absent_count,
        started_at=s.started_at,
        closed_at=s.closed_at,
    )


# ── Sessions ─────────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=AttendanceSessionResponse)
def create_attendance_session(
    data: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Teacher profile not found")
    teacher_id = teacher.id if teacher else 1
    session = create_session(db, data, teacher_id)
    return session_to_response(session)


@router.get("/sessions", response_model=List[AttendanceSessionResponse])
def list_sessions(
    class_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AttendanceSession)
    if class_id:
        q = q.filter(AttendanceSession.class_id == class_id)
    if subject_id:
        q = q.filter(AttendanceSession.subject_id == subject_id)
    if date_from:
        q = q.filter(AttendanceSession.date >= date_from)
    if date_to:
        q = q.filter(AttendanceSession.date <= date_to)

    # Teacher sees only their sessions
    if current_user.role.value == "TEACHER":
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if teacher:
            q = q.filter(AttendanceSession.teacher_id == teacher.id)

    total = q.count()
    sessions = q.order_by(AttendanceSession.date.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return [session_to_response(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=AttendanceSessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    s = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_to_response(s)


@router.get("/sessions/{session_id}/students")
def get_session_students(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    students = get_class_students(db, session.class_id)
    records_map = {
        r.student_id: r
        for r in db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    }

    result = []
    for s in students:
        rec = records_map.get(s.id)
        result.append({
            "student_id": s.id,
            "student_name": s.user.full_name,
            "roll_number": s.roll_number,
            "student_uid": s.student_id,
            "face_registered": s.face_registered,
            "status": rec.status if rec else None,
            "method": rec.method if rec else None,
            "confidence_score": rec.confidence_score if rec else None,
            "record_id": rec.id if rec else None,
        })
    return result


@router.post("/sessions/{session_id}/close")
def close_attendance_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    session = close_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session closed", "session_id": session_id}


# ── Mark Attendance ───────────────────────────────────────────────────────────

@router.post("/mark")
def mark_attendance(
    data: BulkMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    try:
        records = bulk_mark_attendance(db, data.session_id, data.records, current_user.id)
        return {"message": "Attendance marked", "count": len(records)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/records/{record_id}")
def update_record(
    record_id: int,
    data: UpdateAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    try:
        record = update_attendance_record(
            db, record_id, data.status, current_user.id, data.reason
        )
        return {"message": "Attendance updated", "record_id": record.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Stats & History ───────────────────────────────────────────────────────────

@router.get("/student/{student_id}/stats")
def student_stats(
    student_id: int,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Students can only see their own stats
    if current_user.role.value == "STUDENT":
        s = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not s or s.id != student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    threshold = get_attendance_threshold(db)

    if subject_id:
        stats = get_student_attendance_stats(db, student_id, subject_id)
        stats["is_low_attendance"] = stats["percentage"] < threshold
        return {
            "student_id": student_id,
            "student_name": student.user.full_name,
            **stats,
        }

    # All subjects
    from app.models.subject import Subject
    from app.models.associations import student_classes
    from app.models.class_model import Class

    classes = student.classes
    result = []
    for cls in classes:
        subjects = db.query(Subject).filter(Subject.class_id == cls.id).all()
        for subj in subjects:
            stats = get_student_attendance_stats(db, student_id, subj.id)
            stats["is_low_attendance"] = stats["percentage"] < threshold
            result.append({
                "subject_id": subj.id,
                "subject_name": subj.name,
                "subject_code": subj.code,
                **stats,
            })
    return result


@router.get("/student/{student_id}/history")
def student_history(
    student_id: int,
    subject_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value == "STUDENT":
        s = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not s or s.id != student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    q = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id)
    if subject_id:
        q = q.filter(AttendanceRecord.subject_id == subject_id)
    if date_from:
        q = q.filter(AttendanceRecord.date >= date_from)
    if date_to:
        q = q.filter(AttendanceRecord.date <= date_to)

    total = q.count()
    records = q.order_by(AttendanceRecord.date.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "records": [
            {
                "id": r.id,
                "date": r.date,
                "subject_name": r.subject.name if r.subject else None,
                "status": r.status,
                "method": r.method,
                "confidence_score": r.confidence_score,
                "timestamp": r.timestamp,
            }
            for r in records
        ],
    }


@router.get("/audit-log")
def get_audit_log(
    student_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    q = db.query(AttendanceAuditLog)
    if student_id:
        q = q.filter(AttendanceAuditLog.student_id == student_id)
    total = q.count()
    logs = q.order_by(AttendanceAuditLog.timestamp.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "total": total,
        "logs": [
            {
                "id": l.id,
                "student_name": l.student.user.full_name if l.student else None,
                "previous_status": l.previous_status,
                "new_status": l.new_status,
                "changed_by": l.changed_by_user.full_name if l.changed_by_user else None,
                "reason": l.reason,
                "timestamp": l.timestamp,
            }
            for l in logs
        ],
    }
