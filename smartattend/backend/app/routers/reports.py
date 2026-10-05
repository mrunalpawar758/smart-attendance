from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional
from datetime import date
import io
import csv

from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.models.subject import Subject
from app.models.class_model import Class
from app.auth.dependencies import get_current_user
from app.services.settings_service import get_attendance_threshold

router = APIRouter(prefix="/api/reports", tags=["reports"])


def calc_percentage(present: int, total: int) -> float:
    return round(present / total * 100, 2) if total > 0 else 0.0


@router.get("/student/{student_id}")
def student_report(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    threshold = get_attendance_threshold(db)

    # Subject-wise breakdown
    subject_ids = (
        db.query(AttendanceRecord.subject_id)
        .filter(AttendanceRecord.student_id == student_id)
        .distinct()
        .all()
    )

    subjects_data = []
    for (sid,) in subject_ids:
        subj = db.query(Subject).filter(Subject.id == sid).first()
        total = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.subject_id == sid,
        ).scalar()
        present = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.subject_id == sid,
            AttendanceRecord.status == AttendanceStatus.PRESENT,
        ).scalar()
        pct = calc_percentage(present, total)
        subjects_data.append({
            "subject_id": sid,
            "subject_name": subj.name if subj else "Unknown",
            "subject_code": subj.code if subj else "",
            "total_classes": total,
            "present": present,
            "absent": total - present,
            "percentage": pct,
            "is_low": pct < threshold,
        })

    # Overall
    total_all = sum(s["total_classes"] for s in subjects_data)
    present_all = sum(s["present"] for s in subjects_data)

    return {
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "roll_number": student.roll_number,
            "full_name": student.user.full_name,
            "email": student.user.email,
            "department": student.department.name if student.department else None,
        },
        "overall": {
            "total_classes": total_all,
            "present": present_all,
            "absent": total_all - present_all,
            "percentage": calc_percentage(present_all, total_all),
        },
        "subjects": subjects_data,
        "threshold": threshold,
    }


@router.get("/class/{class_id}")
def class_report(
    class_id: int,
    subject_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    threshold = get_attendance_threshold(db)
    students = cls.students

    rows = []
    for student in students:
        q = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.class_id == class_id,
        )
        if subject_id:
            q = q.filter(AttendanceRecord.subject_id == subject_id)
        if date_from:
            q = q.filter(AttendanceRecord.date >= date_from)
        if date_to:
            q = q.filter(AttendanceRecord.date <= date_to)

        total = q.count()
        present = q.filter(AttendanceRecord.status == AttendanceStatus.PRESENT).count()
        pct = calc_percentage(present, total)

        rows.append({
            "student_id": student.student_id,
            "roll_number": student.roll_number,
            "full_name": student.user.full_name,
            "total": total,
            "present": present,
            "absent": total - present,
            "percentage": pct,
            "is_low": pct < threshold,
        })

    rows.sort(key=lambda x: x["roll_number"])
    return {
        "class": {"id": cls.id, "name": cls.name, "code": cls.code},
        "threshold": threshold,
        "students": rows,
    }


@router.get("/subject/{subject_id}")
def subject_report(
    subject_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")

    threshold = get_attendance_threshold(db)

    # Get all students who have records for this subject
    student_ids = (
        db.query(AttendanceRecord.student_id)
        .filter(AttendanceRecord.subject_id == subject_id)
        .distinct()
        .all()
    )

    rows = []
    for (sid,) in student_ids:
        q = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == sid,
            AttendanceRecord.subject_id == subject_id,
        )
        if date_from:
            q = q.filter(AttendanceRecord.date >= date_from)
        if date_to:
            q = q.filter(AttendanceRecord.date <= date_to)

        total = q.count()
        present = q.filter(AttendanceRecord.status == AttendanceStatus.PRESENT).count()
        pct = calc_percentage(present, total)

        s = db.query(Student).filter(Student.id == sid).first()
        rows.append({
            "student_id": s.student_id if s else "",
            "roll_number": s.roll_number if s else "",
            "full_name": s.user.full_name if s else "Unknown",
            "total": total,
            "present": present,
            "absent": total - present,
            "percentage": pct,
            "is_low": pct < threshold,
        })

    rows.sort(key=lambda x: x["roll_number"])
    return {
        "subject": {"id": subj.id, "name": subj.name, "code": subj.code},
        "threshold": threshold,
        "students": rows,
    }


@router.get("/daily")
def daily_report(
    report_date: date = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from datetime import date as dt
    if not report_date:
        report_date = dt.today()

    sessions = db.query(AttendanceSession).filter(AttendanceSession.date == report_date).all()
    return {
        "date": report_date,
        "sessions": [
            {
                "id": s.id,
                "class_name": s.class_.name if s.class_ else None,
                "subject_name": s.subject.name if s.subject else None,
                "teacher": s.teacher.user.full_name if s.teacher else None,
                "total": s.total_students,
                "present": s.present_count,
                "absent": s.absent_count,
                "method": s.method,
                "status": s.status,
            }
            for s in sessions
        ],
        "summary": {
            "total_sessions": len(sessions),
            "total_students": sum(s.total_students for s in sessions),
            "total_present": sum(s.present_count for s in sessions),
            "total_absent": sum(s.absent_count for s in sessions),
        },
    }


@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from datetime import date as dt
    from app.models.teacher import Teacher as TeacherModel
    from app.models.class_model import Class as ClassModel
    from app.models.department import Department

    today = dt.today()

    total_students = db.query(func.count(Student.id)).filter(Student.is_active == True).scalar()
    total_teachers = db.query(func.count(TeacherModel.id)).filter(TeacherModel.is_active == True).scalar()
    total_classes = db.query(func.count(ClassModel.id)).filter(ClassModel.is_active == True).scalar()
    total_subjects = db.query(func.count(Subject.id)).filter(Subject.is_active == True).scalar()

    today_sessions = db.query(func.count(AttendanceSession.id)).filter(
        AttendanceSession.date == today
    ).scalar()
    today_present = db.query(func.sum(AttendanceSession.present_count)).filter(
        AttendanceSession.date == today
    ).scalar() or 0
    today_total = db.query(func.sum(AttendanceSession.total_students)).filter(
        AttendanceSession.date == today
    ).scalar() or 0

    threshold = get_attendance_threshold(db)

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "total_subjects": total_subjects,
        "today_sessions": today_sessions,
        "today_attendance_percentage": calc_percentage(today_present, today_total),
        "threshold": threshold,
    }


@router.get("/export/csv/{class_id}")
def export_class_csv(
    class_id: int,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = class_report(class_id, subject_id, None, None, db, _)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["roll_number", "full_name", "total", "present", "absent", "percentage"])
    writer.writeheader()
    for row in data["students"]:
        writer.writerow({k: row[k] for k in ["roll_number", "full_name", "total", "present", "absent", "percentage"]})
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=class_{class_id}_attendance.csv"},
    )
