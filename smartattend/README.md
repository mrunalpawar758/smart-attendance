# SmartAttend — Face Recognition & Manual Attendance System

A production-style Smart Attendance Management System for colleges and institutes.  
Supports **Face Recognition**, **Manual**, and **Hybrid** attendance with role-based access for Admin, Teacher, and Student.

---

## Features

| Feature | Status |
|---|---|
| JWT Authentication (Admin/Teacher/Student) | ✅ |
| Admin: Manage Students, Teachers, Classes, Subjects, Departments | ✅ |
| Manual Attendance (mark individual/bulk) | ✅ |
| Face Recognition Attendance | ✅ (requires dlib) |
| Hybrid Attendance (Face + Manual fallback) | ✅ |
| Attendance Session Management | ✅ |
| Attendance Calculation & % | ✅ |
| Low Attendance Warning (configurable threshold) | ✅ |
| Attendance Audit Log | ✅ |
| Reports: Class / Subject / Student / Daily | ✅ |
| CSV Export | ✅ |
| System Settings (configurable) | ✅ |
| Duplicate Attendance Prevention | ✅ |
| Responsive UI (Desktop/Tablet/Mobile) | ✅ |
| Role-based Route Protection | ✅ |
| Privacy-conscious Face Data Handling | ✅ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts |
| Backend | Python 3.11, FastAPI |
| Database | PostgreSQL 15 |
| Auth | JWT (python-jose + passlib bcrypt) |
| Face Recognition | face_recognition (dlib) + OpenCV |
| ORM | SQLAlchemy 2.0 |
| Containerization | Docker + Docker Compose |

---

## Project Structure

```
smartattend/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings (env vars)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/              # ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route handlers
│   │   ├── services/            # Business logic layer
│   │   ├── auth/                # JWT + password helpers
│   │   └── face_recognition/    # Face detect/encode/match service
│   ├── seed.py                  # Demo data seeder
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Routing
│   │   ├── context/             # Auth context
│   │   ├── layouts/             # AppLayout (sidebar + top bar)
│   │   ├── pages/
│   │   │   ├── admin/           # Admin pages
│   │   │   ├── teacher/         # Teacher pages
│   │   │   └── student/         # Student pages
│   │   ├── components/ui/       # Reusable UI components
│   │   ├── services/api.ts      # Axios API client
│   │   └── types/index.ts       # TypeScript types
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## Quick Start — Local Development

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 15 (or Docker)
- Git

---

### 1. Clone / open the project

```bash
cd smartattend
```

---

### 2. Start PostgreSQL

**Option A — Docker (easiest):**
```bash
docker run -d \
  --name smartattend_pg \
  -e POSTGRES_USER=smartattend \
  -e POSTGRES_PASSWORD=smartattend123 \
  -e POSTGRES_DB=smartattend_db \
  -p 5432:5432 \
  postgres:15-alpine
```

**Option B — Local PostgreSQL:**  
Create a database named `smartattend_db` and a user `smartattend` with password `smartattend123`.

---

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install core dependencies (without face_recognition)
pip install fastapi uvicorn[standard] sqlalchemy alembic psycopg2-binary \
  python-jose[cryptography] passlib[bcrypt] python-multipart \
  python-dotenv pydantic pydantic-settings pillow numpy \
  pandas openpyxl reportlab httpx aiofiles pytest pytest-asyncio

# Copy env file
copy .env.example .env       # Windows
# cp .env.example .env       # Linux/Mac

# Edit .env if needed (DATABASE_URL, JWT_SECRET)

# Seed demo data (creates tables + demo accounts)
python seed.py

# Start backend
uvicorn app.main:app --reload --port 8000
```

API Docs: http://localhost:8000/api/docs

---

### 4. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend: http://localhost:5173

---

### 5. Face Recognition Setup (Optional)

Face recognition requires `dlib` which needs CMake and build tools.

**Linux/Mac:**
```bash
pip install cmake dlib face-recognition opencv-python-headless
```

**Windows:**
```bash
# Install CMake: https://cmake.org/download/
# Install Visual Studio Build Tools
# Then:
pip install cmake
pip install dlib
pip install face-recognition
```

Once installed, restart the backend. The `/api/face/status` endpoint will show `"available": true`.

---

## Docker — Full Stack

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:8000/api/docs  
- Database: localhost:5432

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `JWT_SECRET` | (set in .env) | Secret key for JWT signing — **change in production** |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Token TTL (8 hours) |
| `FACE_RECOGNITION_THRESHOLD` | `0.55` | Max face distance (lower = stricter) |
| `DEFAULT_ATTENDANCE_THRESHOLD` | `75.0` | Low attendance warning % |
| `UPLOAD_DIR` | `./uploads` | File upload directory |
| `FACE_PROFILES_DIR` | `./uploads/face_profiles` | Face embedding storage |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@smartattend.edu | Admin@123 |
| Teacher | teacher@smartattend.edu | Teacher@123 |
| Student | student@smartattend.edu | Student@123 |

Additional teachers: meena.patel@smartattend.edu, ravi.kumar@smartattend.edu  
Additional students: All created with password **Student@123**

---

## API Reference

### Authentication
```
POST /api/auth/login          Login (returns JWT)
GET  /api/auth/me             Get current user
POST /api/auth/change-password
```

### Students
```
GET    /api/students           List (search, filter, paginate)
GET    /api/students/{id}
POST   /api/students           Create (Admin only)
PUT    /api/students/{id}      Update (Admin only)
DELETE /api/students/{id}      Deactivate (Admin only)
```

### Teachers
```
GET    /api/teachers
GET    /api/teachers/{id}/subjects
POST   /api/teachers           Create (Admin only)
PUT    /api/teachers/{id}
DELETE /api/teachers/{id}
```

### Face Recognition
```
GET  /api/face/status          Check if library available
POST /api/face/register        Register student face (images: base64[])
POST /api/face/recognize       Recognize faces in frame
GET  /api/face/profile/{id}    Get profile info
DELETE /api/face/profile/{id}  Remove face data (Admin)
```

### Attendance
```
POST /api/attendance/sessions              Create session
GET  /api/attendance/sessions              List sessions
GET  /api/attendance/sessions/{id}/students
POST /api/attendance/sessions/{id}/close
POST /api/attendance/mark                 Bulk mark attendance
PUT  /api/attendance/records/{id}         Update single record
GET  /api/attendance/student/{id}/stats   Attendance stats
GET  /api/attendance/student/{id}/history Attendance history
GET  /api/attendance/audit-log
```

### Reports
```
GET /api/reports/student/{id}
GET /api/reports/class/{id}
GET /api/reports/subject/{id}
GET /api/reports/daily
GET /api/reports/dashboard/stats
GET /api/reports/export/csv/{class_id}
```

### Settings
```
GET /api/settings
PUT /api/settings/{key}
PUT /api/settings           Bulk update
```

---

## Core Workflow

```
Teacher Login
  → Select Class + Subject
  → Create Attendance Session
  → Choose Method: Manual / Face / Hybrid
        Manual: Click Present/Absent per student
        Face:   Open camera → start recognition → auto-mark
        Hybrid: Face recognition runs first, manual override for unrecognized
  → Save Session
  → System calculates %
  → Low attendance warning if below threshold
  → Reports available for Admin / Teacher / Student
```

---

## Running Tests

```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest tests/ -v
```

Tests cover: login, role authorization, department CRUD, health endpoint.

---

## Known Limitations

1. **Face recognition requires dlib** — a C++ compilation-heavy library. On Windows, CMake and Visual Studio Build Tools must be installed. The system gracefully falls back to manual attendance when not available.

2. **No liveness detection** — The architecture supports adding it (check `face_recognition/service.py`) but blink/motion detection is not yet implemented.

3. **Single-server** — No horizontal scaling support yet. Adding Redis for session caching and a load balancer is the recommended next step.

4. **No email notifications** — Low-attendance notifications via email are not yet implemented.

5. **CSV export only** — PDF/Excel export needs `reportlab`/`openpyxl` integration (files included in requirements).

---

## Deployment Checklist

- [ ] Change `JWT_SECRET` to a random 64-char string
- [ ] Set `APP_ENV=production`
- [ ] Configure production `DATABASE_URL`
- [ ] Set `FRONTEND_URL` to your actual domain
- [ ] Enable HTTPS (reverse proxy: nginx / Caddy)
- [ ] Back up `uploads/` directory (face profiles)
- [ ] Set strong passwords for demo accounts or remove them
- [ ] Configure PostgreSQL connection pooling (PgBouncer)

---

## Contributing

Pull requests welcome. Please follow existing code patterns:
- Services contain business logic (not routers)
- Pydantic schemas for all request/response validation
- All DB access through SQLAlchemy sessions
- React pages use the typed API client in `src/services/api.ts`
