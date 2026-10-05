from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import engine, Base

# Import all models so SQLAlchemy can create tables
import app.models  # noqa: F401

from app.routers import (
    auth, departments, classes, subjects,
    students, teachers, face, attendance, reports, settings as settings_router
)

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartAttend API",
    description="Smart Attendance Management System — Face Recognition & Manual Attendance",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (uploaded photos)
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(classes.router)
app.include_router(subjects.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(face.router)
app.include_router(attendance.router)
app.include_router(reports.router)
app.include_router(settings_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
