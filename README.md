# Smart Data Importer

Smart Data Importer is a full-stack CSV ingestion prototype that helps users bring customer data into a MySQL database, review column mappings, validate records, and inspect an import report. It combines deterministic validation rules with an optional Groq-powered schema-mapping step.

The repository contains a React frontend and a Node.js/Express backend. This is an in-progress MVP; the complete workflow depends on correct MySQL, Firebase, and optional Groq configuration.

## Features

- **CSV upload and inspection:** reads source headers and rows.
- **AI-assisted schema mapping:** uses Groq with Llama 3.3 70B Versatile to suggest matches between uploaded headers and target fields (name, email, phone, age).
- **Manual mapping review:** allows users to correct suggested column assignments before processing.
- **Data validation:** checks required name and email fields, email syntax, duplicate emails within a file, optional phone format, and age constraints.
- **Batch persistence:** inserts valid rows into MySQL in batches and records invalid rows or database insertion errors.
- **Audit reports and history:** shows total, valid, and invalid row counts, a small sample of imported records, and row-level validation reasons.
- **Authentication:** uses Firebase Authentication in the frontend and verifies Firebase ID tokens in the import API.

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, Axios |
| Backend | Node.js, Express |
| Database | MySQL 8, mysql2 |
| CSV processing | csv-parser |
| AI-assisted mapping | Groq SDK, Llama 3.3 70B Versatile |
| Authentication | Firebase Authentication, Firebase Admin |
| Local containers | Docker, Docker Compose |

## Architecture

~~~text
React + Vite
    |
    | CSV upload / HTTP requests
    v
Express API
    ├── CSV header extraction
    ├── Groq-assisted header mapping
    │       └── Manual mapping fallback
    ├── Field validation
    └── Batched MySQL inserts
            |
            v
        MySQL tables
        ├── users
        ├── imports
        ├── customers
        └── import_errors
~~~

## Repository Layout

~~~text
smart-data-importer/
├── frontend/                 # React UI and Firebase client auth
├── backend/
│   ├── db/                   # MySQL connection and schema initialization
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── services/         # CSV, mapping, validation, import, AI
├── docker-compose.yml
└── .gitignore
~~~

## Requirements

- Node.js and npm
- MySQL 8, or Docker with Docker Compose
- A Firebase project with Google sign-in configured
- A Firebase Admin service-account credential file stored locally
- A Groq API key for AI-assisted column mapping

## Local Setup

### 1. Clone the repository

~~~bash
git clone https://github.com/kmanaswini6/smart-data-importer.git
cd smart-data-importer
~~~

### 2. Configure backend environment variables

Create backend/.env locally:

~~~env
PORT=5000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=smart_data_importer
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_bytes
GROQ_API_KEY=your_groq_api_key
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your/firebase-service-account.json
~~~

Use a long, unique random value for JWT_SECRET. Never reuse a password or commit your actual .env file.

The Firebase Admin SDK uses Application Default Credentials. Set GOOGLE_APPLICATION_CREDENTIALS to the absolute path of your downloaded Firebase service-account JSON file. Keep the file outside Git; do not add it to the repository.

Create a MySQL database and user with permissions for smart_data_importer. The backend initializes its application tables when it connects successfully.

### 3. Configure the frontend

Create frontend/.env.local using your Firebase web app configuration:

~~~env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
~~~

The frontend currently sends requests to http://localhost:5000 from frontend/src/App.jsx. Update this URL if the backend runs elsewhere.

### 4. Install and run

Terminal 1 — backend:

~~~bash
cd backend
npm install
npm run dev
~~~

Terminal 2 — frontend:

~~~bash
cd frontend
npm install
npm run dev
~~~

Open the local URL printed by Vite, typically http://localhost:5173.

### Optional: Docker Compose

Copy .env.example to .env in the repository root, replace every placeholder with your own local values, then run:

~~~bash
docker compose up --build
~~~

The Compose configuration requires a database password and JWT secret from the environment; it no longer contains fixed passwords. The frontend is exposed on port 8080 by default. Firebase Admin credentials must also be configured for the backend container using a securely mounted credential file and GOOGLE_APPLICATION_CREDENTIALS; do not bake service-account credentials into an image.

## AI Mapping Behavior

The Groq integration asks the configured language model to map the uploaded CSV headers to the application's known target fields. The user can review and change the suggested mapping before processing. If the AI request fails, the upload route falls back to empty mapping suggestions for manual selection.

The AI feature is **column-mapping assistance**; the current code does not implement general-purpose AI analysis of all uploaded data.

## Security Notes

- Do not commit .env files, Firebase service-account JSON, API keys, database passwords, JWT secrets, or private keys.
- Use unique local secrets and rotate any credentials that may have been exposed before using this project publicly.
- Removing a credential from the latest file does not remove it from earlier Git commits. Because this repository was already public, keep it private until you review and clean its Git history; rotate any real credentials that appeared in earlier versions.
- The development master-login bypass and hard-coded JWT fallback have been removed from the authentication controller.
- Docker Compose reads credentials from environment variables instead of embedding fixed values.
- This project is an MVP and has not been represented as production-ready. Review and test authentication, file upload limits, error handling, and database access before deployment.

## Potential Next Steps

- Add automated unit and end-to-end tests for parsing, mapping, validation, authentication, and import edge cases.
- Make the frontend API URL configurable through an environment variable.
- Improve upload-size limits, temporary-file cleanup, and error recovery.
- Add screenshots and a demo after verifying the full workflow locally.
