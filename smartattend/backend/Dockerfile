FROM python:3.11-slim

# System deps for dlib / face_recognition (optional — comment out if not needed)
RUN apt-get update && apt-get install -y \
    build-essential cmake libopenblas-dev liblapack-dev \
    libx11-dev libgtk-3-dev libboost-all-dev \
    libopencv-dev python3-opencv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# Install without dlib first; uncomment below to enable face recognition
# RUN pip install --no-cache-dir dlib face-recognition
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] sqlalchemy alembic psycopg2-binary \
    python-jose[cryptography] passlib[bcrypt] python-multipart \
    python-dotenv pydantic pydantic-settings pillow numpy \
    pandas openpyxl reportlab httpx aiofiles pytest pytest-asyncio

COPY . .

RUN mkdir -p uploads/face_profiles

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
