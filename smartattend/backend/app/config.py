from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SmartAttend"
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "postgresql://smartattend:smartattend123@localhost:5432/smartattend_db"

    # JWT
    JWT_SECRET: str = "smartattend-dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Face Recognition
    FACE_RECOGNITION_THRESHOLD: float = 0.55
    FACE_RECOGNITION_MODEL: str = "hog"

    # Attendance
    DEFAULT_ATTENDANCE_THRESHOLD: float = 75.0

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    FACE_PROFILES_DIR: str = "./uploads/face_profiles"

    # Seed
    SEED_ADMIN_EMAIL: str = "admin@smartattend.edu"
    SEED_ADMIN_PASSWORD: str = "Admin@123"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure upload directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.FACE_PROFILES_DIR, exist_ok=True)
