from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class TeacherCreate(BaseModel):
    teacher_id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    department_id: int
    designation: Optional[str] = None
    qualification: Optional[str] = None
    subject_ids: Optional[List[int]] = []


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    is_active: Optional[bool] = None
    subject_ids: Optional[List[int]] = None


class TeacherResponse(BaseModel):
    id: int
    user_id: int
    teacher_id: str
    full_name: str
    email: str
    phone: Optional[str]
    department_id: int
    department_name: Optional[str] = None
    designation: Optional[str]
    qualification: Optional[str]
    is_active: bool
    subject_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True
