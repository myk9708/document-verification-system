# AI & Blockchain Document Verification System

A full-stack web application for verifying documents (birth certificates, academic transcripts, ID documents, experience certificates) using simulated AI analysis and blockchain-style hash tracking, with role-based portals for individuals, issuing authorities, and verifying authorities.

## Features

- **JWT-based authentication** with three user roles: Individual, Issuing Authority, Verifying Authority
- **Document upload & AI analysis** — simulated confidence scoring across format validation, text extraction, pattern recognition, and fraud detection
- **Blockchain-style verification** — every document action (upload, approval, rejection, issuance) is recorded as a hashed block in a simple chain
- **Authority approval workflow** — verifying authorities can approve or reject pending documents
- **Certificate issuance** — issuing authorities can issue verified certificates directly to individuals
- **Downloadable PDF certificates** for verified documents
- **In-app notifications** for document status updates
- **Hash-based public verification** — look up any document's authenticity by its blockchain hash

## Tech Stack

**Frontend**
- React 18
- React Router 6
- Plain CSS

**Backend**
- Flask (Python)
- PyJWT for authentication
- ReportLab for PDF certificate generation
- project/
├── public/
│ └── index.html
├── src/
│ ├── api.js # API client + session handling
│ ├── App.js # Root component & role-based routing
│ ├── App.css
│ ├── index.js
│ └── components/
│ ├── LoginPage.js
│ ├── UserDashboard.js
│ ├── DocumentUpload.js
│ ├── AuthorityPortal.js
│ └── IssuingAuthorityPortal.js
├── backend/
│ ├── app.py # Flask API server
│ └── requirements.txt
├── package.json
└── package-lock.json

## Setup & Running Locally

### Prerequisites
- Node.js and npm
- Python 3.x

### 1. Install frontend dependencies
```bash
npm install
```

### 2. Install backend dependencies
```bash
cd backend
pip install flask flask-cors werkzeug pyjwt reportlab
```

### 3. Start the backend (from the `backend` folder)
```bash
python app.py
```
Runs on `http://localhost:5000`

### 4. Start the frontend (from the project root, in a separate terminal)
```bash
npm start
```
Opens `http://localhost:3000` automatically

### 5. Use the app
Sign up with any name/email/password, choose a role, and explore:
- **Individual** — upload documents for verification
- **Verifying Authority** — approve or reject pending documents
- **Issuing Authority** — issue certificates directly to individuals

## API Overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/register` | POST | Create an account |
| `/api/login` | POST | Log in, returns JWT |
| `/api/upload` | POST | Upload a document for AI analysis |
| `/api/documents` | GET | Get current user's documents |
| `/api/document/<id>/details` | GET | Full document details |
| `/api/document/<id>/download-certificate` | GET | Download PDF certificate |
| `/api/pending-documents` | GET | List documents awaiting review |
| `/api/authority-action` | POST | Approve/reject a document |
| `/api/individuals` | GET | List individual users (issuing authority) |
| `/api/issue-certificate` | POST | Issue a certificate directly |
| `/api/issued-certificates` | GET | List certificates you've issued |
| `/api/notifications` | GET | Get notifications |
| `/api/verify-hash` | POST | Verify a document by blockchain hash |
| `/api/health` | GET | Health check |

## Notes

- This backend uses **in-memory storage** for simplicity — all users, documents, and notifications are lost when the server restarts. For production use, this should be swapped for a real database (e.g. SQLite or PostgreSQL).
- AI analysis is **simulated** (randomized scoring within realistic ranges) rather than using a real AI model.
- Not production-hardened — passwords, secrets, and file handling would need further work before real deployment.
- In-memory storage (no database — data resets on server restart)

## Project Structure
