# Highrr – Employer Platform 🚀

A comprehensive full-stack application for job management, recruitment workflows, and employer verification. Built with **FastAPI** (backend), **React + TypeScript** (frontend), and **PostgreSQL** database.

---

## 📌 Features

### Backend
- **JWT Authentication** - Secure login and token management
- **Role-based Access Control** - Admin, Recruiter, Candidate roles
- **Job Management** - Create, view, delete, and manage job postings
- **Application Pipeline** - Track candidates through applied → shortlisted → interview → selected/rejected
- **Employer Verification** - Multi-level verification system
- **WebSocket Support** - Real-time messaging and notifications
- **Rate Limiting** - Built-in request throttling
- **Database Migrations** - Alembic for schema management

### Frontend
- **Responsive UI** - Built with React, TypeScript, and Tailwind CSS
- **Component Library** - shadcn/ui components
- **State Management** - React Query for data fetching
- **Rich Forms** - React Hook Form with validation
- **Real-time Updates** - WebSocket integration for live data

---

## 🛠 Tech Stack

### Backend
- FastAPI 0.109.0
- PostgreSQL (with SQLAlchemy ORM)
- Python 3.10+
- Alembic (migrations)
- JWT Authentication
- APScheduler (job scheduling)

### Frontend
- React 18+
- TypeScript
- Vite (build tool)
- Tailwind CSS
- shadcn/ui
- React Query
- Axios

---

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.10 or higher
- Node.js 16+ and npm/yarn
- PostgreSQL 12+ (or use Supabase)
- Git

### Backend Setup

#### 1. Clone and navigate to backend

```bash
git clone https://github.com/Asterior/highrr.git
cd highrr/backend
```

#### 2. Create and activate virtual environment

**Windows (PowerShell/CMD):**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### 3. Install dependencies

```bash
pip install -r requirements.txt
```

#### 4. Configure environment variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/highrr_db
# Or use Supabase:
# DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Environment
ENVIRONMENT=development

# Optional: Ollama for AI features
OLLAMA_BASE_URL=http://localhost:11434
```

#### 5. Run database migrations

```bash
alembic upgrade head
```

#### 6. Start the backend server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API Documentation:** http://localhost:8000/docs

---

### Frontend Setup

#### 1. Navigate to frontend directory

```bash
cd ../frontend
```

#### 2. Install dependencies

```bash
npm install
# or
yarn install
```

#### 3. Configure environment variables

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

#### 4. Start development server

```bash
npm run dev
# or
yarn dev
```

**Access the application:** http://localhost:5173

#### 5. Build for production

```bash
npm run build
# or
yarn build
```

---

## 📁 Project Structure

```
highrr/
├── backend/
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   ├── core/              # Core utilities (auth, constants, etc.)
│   │   ├── db/                # Database configuration
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   ├── alembic/               # Database migrations
│   ├── scripts/               # Utility scripts
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client services
│   │   ├── hooks/             # Custom React hooks
│   │   └── stores/            # State management
│   ├── package.json           # Node dependencies
│   └── vite.config.ts         # Vite configuration
│
└── README.md
```

---

## 🚀 Quick Start (Complete Setup)

### For Windows:

```bash
# Backend
cd highrr\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# In a new terminal
cd highrr\frontend
npm install
npm run dev
```

### For macOS/Linux:

```bash
# Backend
cd highrr/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# In a new terminal
cd highrr/frontend
npm install
npm run dev
```

---

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:

1. User registers or logs in via `/api/v1/auth/login`
2. Backend returns a JWT token
3. Frontend stores token in localStorage
4. Token is sent with each request in `Authorization: Bearer <token>` header

---

## 📝 API Documentation

Once the backend is running, visit: **http://localhost:8000/docs**

This provides an interactive Swagger UI where you can test all API endpoints.

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 🛠 Development

### Database Migrations

Create a new migration:
```bash
cd backend
alembic revision --autogenerate -m "Your migration message"
alembic upgrade head
```

### Code Formatting

```bash
# Backend
black backend/app/

# Frontend
npm run lint
```

---

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Verify database credentials

### Frontend can't connect to backend
- Check CORS settings in backend `.env`
- Ensure backend is running on http://localhost:8000
- Check `VITE_API_URL` in frontend `.env.local`

### Missing dependencies
```bash
# Backend
pip install -r requirements.txt --upgrade

# Frontend
npm install --legacy-peer-deps
```

---

## 📄 License

This project is confidential and intended for educational purposes.

---

## 👥 Support

For issues or questions, please contact the development team.
