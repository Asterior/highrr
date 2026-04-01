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

2. Create Virtual Environment (/backend)
python -m venv venv
venv\Scripts\activate
3. Install Dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary passlib[bcrypt] python-jose
4. Create Database (PostgreSQL)

Open Command Prompt and enter PostgreSQL:

psql -U postgres

Then create database:

CREATE DATABASE highrr_db;
5. Configure Database

Go to:

app/db/session.py

Update:

DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/highrr_db"

(Replace YOUR_PASSWORD with your PostgreSQL password)

6. Run Server (/backend)
uvicorn app.main:app --reload
http://127.0.0.1:8000/docs#/
