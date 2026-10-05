from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date
from typing import List, Optional, Dict
import uuid

from app.models.attendance import (
    AttendanceSession, AttendanceRecord, AttendanceAuditLog,
    AttendanceMethod, AttendanceStatus, SessionStatus
)
from app.models.student import Student
from app.models.associations import student_classes
from app.schemas.attendance import (
    AttendanceSessionCreate, BulkMarkRequest, SingleAttendanceRecord
)
from app.services.settings_service import get_attendance_threshold


def generate_session_code(class_id: int, subject_id: int, date_val: date, lecture: int) -> str:
    return f"SES-{class_id}-{subject_id}-{date_val.strftime('%Y%m%d')}-L{lecture}-{uuid.uuid4().hex[:6].upper()}"


def get_class_students(db: Session, class_id: int) -> List[Student]:
    return (
        db.query(Student)
        .join(student_classes, Student.id == student_classes.c.student_id)
        .filter(student_classes.c.class_id == class_id, Student.is_active == True)
        .order_by(Student.roll_number)
        .all()
    )


def create_session(
    db: Session, data: AttendanceSessionCreate, teacher_id: int
) -> AttendanceSession:
    # Check for duplicate session
    existing = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.class_id == data.class_id,
            AttendanceSession.subject_id == data.subject_id,
            AttendanceSession.date == data.date,
            AttendanceSession.lecture_number == data.lecture_number,
        )
        .first()
    )
    if existing:
        return existing

    students = get_class_students(db, data.class_id)
    session_code = generate_session_code(data.class_id, data.subject_id, data.date, data.lecture_number)

    session = AttendanceSession(
        session_code=session_code,
        teacher_id=teacher_id,
        class_id=data.class_id,
        subject_id=data.subject_id,
        date=data.date,
        lecture_number=data.lecture_number,
        method=data.method,
        notes=data.notes,
        total_students=len(students),
        present_count=0,
        absent_count=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def bulk_mark_attendance(
    db: Session, session_id: int, records: List[SingleAttendanceRecord], marked_by_id: int
) -> List[AttendanceRecord]:
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")
    if session.status == SessionStatus.CLOSED:
        raise ValueError("Session is already closed")

    result = []
    for rec in records:
        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.session_id == session_id,
                AttendanceRecord.student_id == rec.student_id,
            )
            .first()
        )
        if existing:
            # Update + audit log
            if existing.status != rec.status:
                audit = AttendanceAuditLog(
                    record_id=existing.id,
                    student_id=existing.student_id,
                    previous_status=existing.status,
                    new_status=rec.status,
                    changed_by=marked_by_id,
                    reason="Attendance updated during session",
                )
                db.add(audit)
            existing.status = rec.status
            existing.method = rec.method
            existing.confidence_score = rec.confidence_score
            existing.marked_by = marked_by_id
            result.append(existing)
        else:
            new_rec = AttendanceRecord(
                session_id=session_id,
                student_id=rec.student_id,
                subject_id=session.subject_id,
                class_id=session.class_id,
                date=session.date,
                status=rec.status,
                method=rec.method,
                confidence_score=rec.confidence_score,
                marked_by=marked_by_id,
            )
            db.add(new_rec)
            result.append(new_rec)

    db.commit()
    # Update session counts
    update_session_counts(db, session_id)
    return result


def update_session_counts(db: Session, session_id: int):
    present = (
        db.query(func.count(AttendanceRecord.id))
        .filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.status == AttendanceStatus.PRESENT,
        )
        .scalar()
    )
    absent = (
        db.query(func.count(AttendanceRecord.id))
        .filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.status == AttendanceStatus.ABSENT,
        )
        .scalar()
    )
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if session:
        session.present_count = present
        session.absent_count = absent
        db.commit()


def close_session(db: Session, session_id: int):
    from datetime import datetime
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if session:
        session.status = SessionStatus.CLOSED
        session.closed_at = datetime.utcnow()
        db.commit()
    return session


def get_student_attendance_stats(
    db: Session, student_id: int, subject_id: Optional[int] = None
) -> Dict:
    query = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id)
    if subject_id:
        query = query.filter(AttendanceRecord.subject_id == subject_id)

    total = query.count()
    present = query.filter(AttendanceRecord.status == AttendanceStatus.PRESENT).count()
    absent = total - present
    percentage = round((present / total * 100), 2) if total > 0 else 0.0

    # Threshold check (default 75)
    threshold = 75.0
    return {
        "total_classes": total,
        "present_count": present,
        "absent_count": absent,
        "percentage": percentage,
        "is_low_attendance": percentage < threshold,
    }


def update_attendance_record(
    db: Session, record_id: int, new_status: AttendanceStatus,
    changed_by_id: int, reason: Optional[str] = None
) -> AttendanceRecord:
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise ValueError("Record not found")

    old_status = record.status
    record.status = new_status
    record.method = AttendanceMethod.MANUAL
    record.marked_by = changed_by_id

    audit = AttendanceAuditLog(
        record_id=record.id,
        student_id=record.student_id,
        previous_status=old_status,
        new_status=new_status,
        changed_by=changed_by_id,
        reason=reason,
    )
    db.add(audit)
    db.commit()
    db.refresh(record)
    update_session_counts(db, record.session_id)
    return record
