"""
Demo seed data for SmartAttend.
Run: python seed.py
Creates departments, classes, subjects, teachers, students and sample attendance.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, timedelta
import random

from app.database import SessionLocal, engine, Base
import app.models  # ensure all models registered
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.class_model import Class
from app.models.subject import Subject
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceMethod, AttendanceStatus, SessionStatus
from app.models.settings import SystemSettings
from app.auth.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed():
    print("🌱 Seeding database...")

    # ── Settings ──────────────────────────────────────────────────────────────
    for key, value in [
        ("attendance_threshold", "75.0"),
        ("face_recognition_threshold", "0.55"),
        ("institution_name", "SmartAttend Institute of Technology"),
        ("academic_year", "2025-2026"),
        ("working_days_per_week", "6"),
        ("session_duration_minutes", "60"),
        ("face_recognition_enabled", "true"),
    ]:
        if not db.query(SystemSettings).filter(SystemSettings.key == key).first():
            db.add(SystemSettings(key=key, value=value))
    db.commit()

    # ── Admin user ────────────────────────────────────────────────────────────
    admin_user = db.query(User).filter(User.email == "admin@smartattend.edu").first()
    if not admin_user:
        admin_user = User(
            email="admin@smartattend.edu",
            username="admin",
            full_name="System Administrator",
            role=UserRole.ADMIN,
            hashed_password=hash_password("Admin@123"),
        )
        db.add(admin_user)
        db.commit()
        print("  ✓ Admin user created")

    # ── Departments ───────────────────────────────────────────────────────────
    dept_data = [
        ("Computer Science & Engineering", "CSE"),
        ("Information Technology", "IT"),
        ("Electronics & Communication", "ECE"),
        ("Mechanical Engineering", "ME"),
    ]
    depts = {}
    for name, code in dept_data:
        d = db.query(Department).filter(Department.code == code).first()
        if not d:
            d = Department(name=name, code=code)
            db.add(d)
            db.commit()
        depts[code] = d
    print(f"  ✓ {len(depts)} departments")

    # ── Classes ───────────────────────────────────────────────────────────────
    class_data = [
        ("CSE Third Year A", "CSE-3A", 3, "A", depts["CSE"]),
        ("CSE Third Year B", "CSE-3B", 3, "B", depts["CSE"]),
        ("IT Second Year A", "IT-2A", 2, "A", depts["IT"]),
        ("ECE Fourth Year A", "ECE-4A", 4, "A", depts["ECE"]),
    ]
    classes = {}
    for name, code, year, div, dept in class_data:
        c = db.query(Class).filter(Class.code == code).first()
        if not c:
            c = Class(name=name, code=code, year=year, division=div, department_id=dept.id)
            db.add(c)
            db.commit()
        classes[code] = c
    print(f"  ✓ {len(classes)} classes")

    # ── Subjects ──────────────────────────────────────────────────────────────
    subject_data = [
        ("Data Structures & Algorithms", "CSE301", depts["CSE"], classes["CSE-3A"]),
        ("Database Management Systems", "CSE302", depts["CSE"], classes["CSE-3A"]),
        ("Operating Systems", "CSE303", depts["CSE"], classes["CSE-3A"]),
        ("Computer Networks", "CSE304", depts["CSE"], classes["CSE-3B"]),
        ("Machine Learning", "CSE305", depts["CSE"], classes["CSE-3B"]),
        ("Web Technologies", "IT201", depts["IT"], classes["IT-2A"]),
        ("Digital Electronics", "ECE401", depts["ECE"], classes["ECE-4A"]),
    ]
    subjects = {}
    for name, code, dept, cls in subject_data:
        s = db.query(Subject).filter(Subject.code == code).first()
        if not s:
            s = Subject(name=name, code=code, department_id=dept.id, class_id=cls.id)
            db.add(s)
            db.commit()
        subjects[code] = s
    print(f"  ✓ {len(subjects)} subjects")

    # ── Teachers ──────────────────────────────────────────────────────────────
    teacher_data = [
        ("T001", "Dr. Anil Sharma", "teacher@smartattend.edu", "Teacher@123", depts["CSE"],
         [subjects["CSE301"], subjects["CSE302"]]),
        ("T002", "Prof. Meena Patel", "meena.patel@smartattend.edu", "Teacher@123", depts["CSE"],
         [subjects["CSE303"], subjects["CSE304"]]),
        ("T003", "Dr. Ravi Kumar", "ravi.kumar@smartattend.edu", "Teacher@123", depts["IT"],
         [subjects["IT201"]]),
        ("T004", "Prof. Sunita Singh", "sunita.singh@smartattend.edu", "Teacher@123", depts["ECE"],
         [subjects["ECE401"]]),
    ]
    teachers = {}
    for tid, name, email, pwd, dept, subj_list in teacher_data:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                username=email.split("@")[0].replace(".", "_"),
                full_name=name,
                role=UserRole.TEACHER,
                hashed_password=hash_password(pwd),
            )
            db.add(user)
            db.flush()
        t = db.query(Teacher).filter(Teacher.teacher_id == tid).first()
        if not t:
            t = Teacher(user_id=user.id, teacher_id=tid, department_id=dept.id, designation="Assistant Professor")
            t.subjects = subj_list
            db.add(t)
            db.commit()
        teachers[tid] = t
    print(f"  ✓ {len(teachers)} teachers")

    # ── Students ──────────────────────────────────────────────────────────────
    student_names = [
        "Rahul Verma", "Priya Sharma", "Aman Gupta", "Rohit Singh",
        "Sneha Patel", "Vikram Joshi", "Anjali Nair", "Karan Mehta",
        "Pooja Reddy", "Arjun Das", "Divya Kumar", "Siddharth Rao",
        "Riya Shah", "Aditya Tiwari", "Neha Mishra", "Rajesh Yadav",
        "Kavya Pillai", "Harsh Malhotra", "Simran Kaur", "Nikhil Bose",
    ]
    main_class = classes["CSE-3A"]
    demo_student = None
    for i, sname in enumerate(student_names, start=1):
        sid = f"2024CSE{i:03d}"
        email = f"{sname.lower().replace(' ', '.')}@student.smartattend.edu"
        if db.query(Student).filter(Student.student_id == sid).first():
            continue
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                username=f"s{sid.lower()}",
                full_name=sname,
                role=UserRole.STUDENT,
                hashed_password=hash_password("Student@123"),
            )
            db.add(user)
            db.flush()
        s = Student(
            user_id=user.id,
            student_id=sid,
            roll_number=f"{i:02d}",
            department_id=depts["CSE"].id,
            year=3,
            division="A",
        )
        s.classes = [main_class]
        db.add(s)
        if i == 1:
            demo_student = s
    db.commit()

    # Create demo student account with known credentials
    demo_email = "student@smartattend.edu"
    if not db.query(User).filter(User.email == demo_email).first():
        demo_user = User(
            email=demo_email,
            username="student_demo",
            full_name="Demo Student",
            role=UserRole.STUDENT,
            hashed_password=hash_password("Student@123"),
        )
        db.add(demo_user)
        db.flush()
        ds = Student(
            user_id=demo_user.id,
            student_id="2024CSE000",
            roll_number="00",
            department_id=depts["CSE"].id,
            year=3,
            division="A",
        )
        ds.classes = [main_class]
        db.add(ds)
        db.commit()
    print(f"  ✓ {len(student_names) + 1} students")

    # ── Sample Attendance Records ─────────────────────────────────────────────
    teacher = teachers["T001"]
    subj = subjects["CSE301"]
    cls = classes["CSE-3A"]
    all_students = [
        s for s in db.query(Student).filter(Student.is_active == True).all()
        if any(c.id == cls.id for c in s.classes)
    ]

    import uuid
    today = date.today()
    for day_offset in range(20, 0, -1):
        session_date = today - timedelta(days=day_offset)
        if session_date.weekday() in (5, 6):  # skip weekends
            continue

        existing = db.query(AttendanceSession).filter(
            AttendanceSession.class_id == cls.id,
            AttendanceSession.subject_id == subj.id,
            AttendanceSession.date == session_date,
            AttendanceSession.lecture_number == 1,
        ).first()
        if existing:
            continue

        sess = AttendanceSession(
            session_code=f"SES-SEED-{session_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}",
            teacher_id=teacher.id,
            class_id=cls.id,
            subject_id=subj.id,
            date=session_date,
            lecture_number=1,
            method=AttendanceMethod.MANUAL,
            status=SessionStatus.CLOSED,
            total_students=len(all_students),
        )
        db.add(sess)
        db.flush()

        present_count = 0
        for student in all_students:
            # Randomly make ~80% present, but keep one student at ~60%
            is_present = random.random() < (0.6 if student.roll_number == "00" else 0.82)
            rec = AttendanceRecord(
                session_id=sess.id,
                student_id=student.id,
                subject_id=subj.id,
                class_id=cls.id,
                date=session_date,
                status=AttendanceStatus.PRESENT if is_present else AttendanceStatus.ABSENT,
                method=AttendanceMethod.MANUAL,
                marked_by=admin_user.id,
            )
            db.add(rec)
            if is_present:
                present_count += 1

        sess.present_count = present_count
        sess.absent_count = len(all_students) - present_count

    db.commit()
    print("  ✓ Sample attendance records (20 days)")

    print("\n✅ Seed complete!")
    print("\n📋 Demo Credentials:")
    print("  Admin    : admin@smartattend.edu / Admin@123")
    print("  Teacher  : teacher@smartattend.edu / Teacher@123")
    print("  Student  : student@smartattend.edu / Student@123")
    print("\n🚀 Start backend: uvicorn app.main:app --reload --port 8000")
    print("📚 API Docs    : http://localhost:8000/api/docs")


if __name__ == "__main__":
    seed()
    db.close()
