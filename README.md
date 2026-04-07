# Highrr – Employer Backend 🚀

This is the backend system for the Highrr Employer platform built using FastAPI and PostgreSQL.

---

## 📌 Features

- JWT Authentication (Login system)
- Role-based access (Admin, Recruiter)
- Job Management (Create, View, Delete)
- Applications System (Apply, Track)
- Pipeline Management (applied → shortlisted → interview → selected/rejected)

---

## 🛠 Tech Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT Authentication

---

## ⚙️ Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/highrr-employer.git
cd highrr-employer/backend
```

### 2. Create virtual environment

```bash
python -m venv .venv
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure database URL

Create `backend/.env` with:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/highrr_db
```

For Supabase pooler, use your project connection string.

### 5. Run backend

```bash
uvicorn app.main:app --reload
```

Swagger docs:

```text
http://127.0.0.1:8000/docs
```
