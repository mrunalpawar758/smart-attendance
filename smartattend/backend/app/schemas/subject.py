from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SubjectCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    department_id: int
    class_id: Optional[int] = None
    credits: Optional[int] = 3


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    class_id: Optional[int] = None
    credits: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str]
    department_id: int
    department_name: Optional[str] = None
    class_id: Optional[int]
    class_name: Optional[str] = None
    credits: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
