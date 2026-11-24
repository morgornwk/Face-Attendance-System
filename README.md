# Face Attendance System

ระบบบันทึกเวลาเข้า-ออกงานด้วยการสแกนใบหน้า (Face Recognition) พัฒนาด้วย FastAPI, InsightFace/ONNX, PostgreSQL, Redis, MinIO และ React Bento Grid UI

---

## Features

- **AI Face Detection & Recognition**: ตรวจจับ จัดตำแหน่ง และจำแนกลักษณะใบหน้าความแม่นยำสูงด้วย InsightFace / ONNX Runtime
- **Hardware Acceleration**: รองรับการประมวลผลผ่าน CoreML (Apple Silicon) และ CUDA (Nvidia GPU) อัตโนมัติ
- **Real-time Attendance**: ระบบบันทึกเวลาเข้า-ออกงานและกระจายข้อมูลสู่แดชบอร์ดทันทีผ่าน WebSocket
- **Anti-Spam & Deduplication**: ป้องกันการสแกนซ้ำซ้อนด้วย Redis Throttling
- **Timezone Sync**: จัดการเวลามาตรฐานประเทศไทย (Asia/Bangkok) ครอบคลุมทั้งฐานข้อมูลและระบบประมวลผล
- **Face Crop Storage**: บันทึกภาพใบหน้าเฉพาะส่วนแบบ Asynchronous ไปยัง MinIO Object Storage
- **Modern Dashboard**: หน้าจอแดชบอร์ดและจัดการข้อมูลพนักงานสไตล์ Bento Grid พัฒนาด้วย React 18 และ Tailwind CSS

---

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0 (AsyncPG), Alembic, Pydantic v2
- **AI & Vision**: InsightFace, ONNX Runtime, OpenCV, NumPy
- **Database & Cache**: PostgreSQL 16, Redis 7
- **Storage**: MinIO (S3 Compatible Storage)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Infrastructure**: Docker, Docker Compose

---

## Project Structure

```
.
├── backend/
│   ├── alembic/              # Database migration scripts
│   ├── app/                  # Backend application source code
│   │   ├── ai/               # Face detection & recognition engine
│   │   ├── api/              # FastAPI router endpoints (v1)
│   │   ├── attendance/       # Real-time attendance processing & tracking
│   │   ├── core/             # Configuration, logging, timezone, error handlers
│   │   ├── database/         # Database connection & base models
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── repositories/     # Data access layer
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic services
│   │   └── websocket/        # WebSocket connection manager & routes
│   ├── docker/               # Dockerfile and docker-compose.yml
│   ├── gui/                  # Desktop Kiosk application (OpenCV)
│   ├── tests/                # Automated pytest test suite
│   ├── alembic.ini           # Alembic configuration
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/                  # Frontend source code
│   │   ├── app/              # Main App orchestrator
│   │   ├── features/         # Feature modules (attendance, employees, system)
│   │   └── shared/           # Reusable UI components, API clients, utilities
│   ├── package.json          # Frontend dependencies
│   ├── tailwind.config.js    # Tailwind configuration
│   └── vite.config.ts        # Vite configuration
└── README.md
```

---

## Quick Start

### 1. Database & Services (Docker)

```bash
docker compose -f backend/docker/docker-compose.yml up -d
```

### 2. Backend Server

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 3. Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
```

- Dashboard Web App: `http://localhost:5173`

### 4. Desktop Kiosk (Webcam Simulation)

```bash
PYTHONPATH=backend python backend/gui/run_kiosk.py
```

---

## Testing

รันชุดทดสอบระบบหลังบ้านทั้งหมดผ่าน Pytest:

```bash
PYTHONPATH=backend .venv/bin/pytest backend/tests
```

---

## Database Schema

### 1. employees (ข้อมูลพนักงาน)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | รหัสอ้างอิงพนักงาน |
| employee_code | VARCHAR(50) | Unique, Indexed | รหัสพนักงาน (เช่น EMP-001) |
| full_name | VARCHAR(200) | Not Null | ชื่อ-นามสกุล |
| department | VARCHAR(100) | Indexed | แผนกหรือฝ่าย |
| position | VARCHAR(100) | Not Null | ตำแหน่งงาน |
| email | VARCHAR(255) | Unique, Nullable | อีเมล |
| phone | VARCHAR(20) | Nullable | เบอร์โทรศัพท์ |
| notes | TEXT | Nullable | หมายเหตุ |
| is_active | BOOLEAN | Default TRUE | สถานะการทำงาน |
| face_registered | BOOLEAN | Default FALSE | สถานะการลงทะเบียนใบหน้า |
| created_at | TIMESTAMPTZ | Not Null | เวลาที่สร้างข้อมูล |
| updated_at | TIMESTAMPTZ | Not Null | เวลาที่อัปเดตข้อมูล |
| deleted_at | TIMESTAMPTZ | Nullable | เวลาที่ลบข้อมูล (Soft Delete) |

### 2. face_embeddings (เวกเตอร์ใบหน้า)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | รหัสอ้างอิงข้อมูลใบหน้า |
| employee_id | UUID | FK (employees.id), Unique | รหัสพนักงาน (1 คนต่อ 1 ชุดข้อมูล) |
| embedding_vector | BYTEA | Not Null | Face Embedding 512 มิติ |
| model_version | VARCHAR(50) | Not Null | รุ่นโมเดล AI ที่ใช้ประมวลผล |
| image_quality_score | FLOAT | Nullable | คะแนนความคมชัดของภาพ |
| image_url | VARCHAR(512) | Nullable | URL ภาพใบหน้าใน MinIO |
| created_at | TIMESTAMPTZ | Not Null | เวลาที่ลงทะเบียนใบหน้า |
| updated_at | TIMESTAMPTZ | Not Null | เวลาที่แก้ไขล่าสุด |
| deleted_at | TIMESTAMPTZ | Nullable | เวลาที่ลบข้อมูล (Soft Delete) |

### 3. attendance_records (ประวัติการเข้า-ออกงาน)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | รหัสอ้างอิงบันทึกเวลา |
| employee_id | UUID | FK (employees.id), Indexed | รหัสพนักงาน |
| work_date | DATE | Indexed | วันที่ทำงาน (Asia/Bangkok) |
| check_in_time | TIMESTAMPTZ | Not Null | เวลาเช็คอินแรกของวัน |
| check_out_time | TIMESTAMPTZ | Nullable | เวลาเช็คเอาท์ล่าสุด |
| camera_id | VARCHAR(100) | Not Null | รหัสกล้องหรือตู้ Kiosk |
| confidence_score | FLOAT | Not Null | ค่าความมั่นใจในการจำแนกใบหน้า |
| status | VARCHAR(20) | Default 'present' | สถานะการเข้างาน |
| image_url | VARCHAR(512) | Nullable | URL ภาพถ่ายขณะสแกนใน MinIO |
| created_at | TIMESTAMPTZ | Not Null | เวลาที่สร้างบันทึก |
| updated_at | TIMESTAMPTZ | Not Null | เวลาที่อัปเดตล่าสุด |
| deleted_at | TIMESTAMPTZ | Nullable | เวลาที่ลบข้อมูล (Soft Delete) |
