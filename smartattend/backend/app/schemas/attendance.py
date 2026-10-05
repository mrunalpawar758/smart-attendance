from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from app.models.attendance import AttendanceMethod, AttendanceStatus, SessionStatus


class AttendanceSessionCreate(BaseModel):
    class_id: int
    subject_id: int
    date: date
    lecture_number: Optional[int] = 1
    method: AttendanceMethod = AttendanceMethod.MANUAL
    notes: Optional[str] = None


class AttendanceSessionResponse(BaseModel):
    id: int
    session_code: str
    teacher_id: int
    teacher_name: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    date: date
    lecture_number: int
    method: AttendanceMethod
    status: SessionStatus
    total_students: int
    present_count: int
    absent_count: int
    started_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


class MarkAttendanceRequest(BaseModel):
    session_id: int
    records: List[dict]
    # records: [{"student_id": 1, "status": "PRESENT", "method": "MANUAL"}]


class SingleAttendanceRecord(BaseModel):
    student_id: int
    status: AttendanceStatus
    method: AttendanceMethod = AttendanceMethod.MANUAL
    confidence_score: Optional[float] = None


class BulkMarkRequest(BaseModel):
    session_id: int
    records: List[SingleAttendanceRecord]


class UpdateAttendanceRequest(BaseModel):
    status: AttendanceStatus
    reason: Optional[str] = None


class AttendanceRecordResponse(BaseModel):
    id: int
    session_id: int
    student_id: int
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    class_id: int
    date: date
    status: AttendanceStatus
    method: AttendanceMethod
    confidence_score: Optional[float]
    timestamp: datetime

    class Config:
        from_attributes = True


class FaceRecognizeRequest(BaseModel):
    session_id: int
    image_data: str  # base64 encoded


class FaceRecognizeResult(BaseModel):
    student_id: Optional[int]
    student_name: Optional[str]
    roll_number: Optional[str]
    status: str  # RECOGNIZED, UNKNOWN, LOW_CONFIDENCE
    confidence: Optional[float]
    marked_present: bool


class AttendanceStatsResponse(BaseModel):
    student_id: int
    student_name: str
    roll_number: str
    subject_id: Optional[int]
    subject_name: Optional[str]
    total_classes: int
    present_count: int
    absent_count: int
    percentage: float
    is_low_attendance: bool
