from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ClassCreate(BaseModel):
    name: str
    code: str
    year: int
    division: Optional[str] = None
    semester: Optional[int] = None
    department_id: int
    description: Optional[str] = None


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    year: Optional[int] = None
    division: Optional[str] = None
    semester: Optional[int] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class ClassResponse(BaseModel):
    id: int
    name: str
    code: str
    year: int
    division: Optional[str]
    semester: Optional[int]
    department_id: int
    department_name: Optional[str] = None
    is_active: bool
    student_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True
