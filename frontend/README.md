# Face Attendance System — Frontend

Modern, senior-level Bento-grid dashboard for the Face Attendance System built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Vite**.

## 🎨 Design Philosophy
Inspired by soft minimalist Bento UI:
- Off-white / light slate background (`#F4F5F6`) with pure white floating cards (`#FFFFFF`).
- Rounded corners (`rounded-3xl` / `rounded-2xl`) and subtle micro-borders.
- Dark charcoal action pills (`#111827`) and soft status badges (mint green, soft amber, rose).
- Real-time live recognition stream with pulse status badges.

## 📁 Architecture (Feature-Sliced Modular Design)

```
frontend/src/
├── app/
│   ├── App.tsx                     # Main dashboard orchestrator & navigation
│   └── ...
├── features/
│   ├── attendance/
│   │   ├── components/
│   │   │   ├── AttendanceChart.tsx       # Weekly pill-bar attendance chart
│   │   │   ├── AttendanceHistoryModal.tsx# Date range & employee history logs
│   │   │   ├── AttendanceStatsCards.tsx  # Top Bento stat cards & avatar stack
│   │   │   └── LiveAttendanceFeed.tsx    # Live WebSocket recognition feed
│   │   └── hooks/
│   │       └── useAttendanceWebSocket.ts # Auto-reconnecting WS client with keepalive ping/pong
│   ├── employees/
│   │   ├── components/
│   │   │   ├── EmployeeList.tsx          # Searchable, filterable employee table
│   │   │   ├── EmployeeFormModal.tsx     # Add & edit employee modal
│   │   │   └── FaceRegisterModal.tsx     # Dual mode: Live Webcam snapshot OR file upload
│   │   └── hooks/
│   │       └── useEmployees.ts           # CRUD & biometrics hooks
│   └── system/
│       ├── components/
│       │   └── SystemStatusCard.tsx      # InsightFace, Redis, PostgreSQL status
│       └── hooks/
│           └── useSystemHealth.ts        # Polling /health microservices
└── shared/
    ├── api/                              # Typed API clients for all backend endpoints
    ├── components/
    │   ├── layout/                       # Sidebar, Header
    │   └── ui/                           # BentoCard, Button, Badge, Modal, Input, Avatar, Toast
    ├── types/                            # TypeScript interfaces matching backend Pydantic models
    └── utils/                            # cn, formatters
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The app will run on `http://localhost:5173`.
All requests to `/api`, `/ws`, and `/health` are automatically proxied to the FastAPI backend running on `http://localhost:8000`.

### 3. Production Build & Typecheck
```bash
npm run build
```
Type checks via `tsc -b` and bundles via `vite build`.
