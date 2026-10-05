"""Basic tests for SmartAttend backend."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.user import User, UserRole
from app.auth.security import hash_password

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    admin = User(
        email="admin@test.com",
        username="admin",
        full_name="Test Admin",
        role=UserRole.ADMIN,
        hashed_password=hash_password("Admin@123"),
    )
    teacher = User(
        email="teacher@test.com",
        username="teacher",
        full_name="Test Teacher",
        role=UserRole.TEACHER,
        hashed_password=hash_password("Teacher@123"),
    )
    student = User(
        email="student@test.com",
        username="student",
        full_name="Test Student",
        role=UserRole.STUDENT,
        hashed_password=hash_password("Student@123"),
    )
    db.add_all([admin, teacher, student])
    db.commit()
    db.close()
    yield


def get_token(email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.json().get("access_token", "")


def test_login_admin():
    resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Admin@123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"


def test_login_wrong_password():
    resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert resp.status_code == 401


def test_get_me():
    token = get_token("admin@test.com", "Admin@123")
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@test.com"


def test_unauthorized_no_token():
    resp = client.get("/api/students")
    assert resp.status_code == 403


def test_role_admin_can_create_department():
    token = get_token("admin@test.com", "Admin@123")
    resp = client.post(
        "/api/departments",
        json={"name": "Test Dept", "code": "TD"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["code"] == "TD"


def test_role_student_cannot_create_department():
    token = get_token("student@test.com", "Student@123")
    resp = client.post(
        "/api/departments",
        json={"name": "Bad Dept", "code": "BD"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
