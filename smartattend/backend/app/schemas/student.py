from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date


class StudentCreate(BaseModel):
    student_id: str
    roll_number: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    department_id: int
    year: int
    division: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    class_ids: Optional[List[int]] = []


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    year: Optional[int] = None
    division: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    is_active: Optional[bool] = None
    class_ids: Optional[List[int]] = None


class StudentResponse(BaseModel):
    id: int
    user_id: int
    student_id: str
    roll_number: str
    full_name: str
    email: str
    phone: Optional[str]
    department_id: int
    department_name: Optional[str] = None
    year: int
    division: Optional[str]
    face_registered: bool
    is_active: bool
    profile_photo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
