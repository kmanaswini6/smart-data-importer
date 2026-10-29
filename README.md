# Smart Data Importer

Smart Data Importer is a full-stack CSV ingestion prototype that helps users bring customer data into a MySQL database, review column mappings, validate records, and inspect an import report. It combines deterministic validation rules with an optional Groq-powered schema-mapping step.

The repository contains a React frontend and a Node.js/Express backend. The project is an MVP and may require environment and service configuration to run the complete workflow locally.

## What it does

- **CSV upload and inspection:** accepts CSV files and reads their headers and rows.
- **Schema mapping:** suggests how source columns map to the application's customer fields (\`name\`, \`email\`, \`phone\`, and \`age\`).
- **AI-assisted mapping:** uses the Groq API to suggest header-to-field matches. If the AI mapping request fails, the backend falls back to empty suggestions so the user can map columns manually.
- **Manual mapping review:** lets users review or change column assignments before processing.
- **Data validation:** checks required name and email fields, email format, duplicate emails within an import, optional phone format, and age constraints.
- **Import processing:** inserts accepted records into MySQL in batches and records invalid rows or database insertion errors.
- **Audit reports and history:** displays import totals, valid/invalid row counts, a small sample of imported records, and row-level validation errors.
- **Authentication integration:** uses Firebase Authentication on the frontend and Firebase Admin token verification in the main import API.

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, Axios |
| Backend | Node.js, Express |
| Database | MySQL 8, \`mysql2\` |
| CSV processing | \`csv-parser\` |
| AI-assisted mapping | Groq SDK, Llama 3.3 70B Versatile |
| Authentication | Firebase Authentication, Firebase Admin |
| Local containers | Docker, Docker Compose |

## Architecture

\`\`\`text
React + Vite frontend
        |
        | HTTP / JSON + CSV upload
        v
Express API
        |
        +--> CSV header extraction
        |
        +--> Groq-assisted header mapping
        |       \`--> manual mapping fallback
        |
        +--> field validation
        |
        +--> batched MySQL inserts
        |
        v
MySQL
  - users
  - imports
  - customers
  - import_errors
\`\`\`

## Repository Layout

\`\`\`text
smart-data-importer/
├── frontend/                 # React UI
│   └── src/
│       ├── components/       # Upload, login, and audit report views
│       ├── context/          # Authentication state
│       └── MappingReview.jsx # Column mapping review
├── backend/
│   ├── db/                   # MySQL connection and schema initialization
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── services/          # CSV, mapping, validation, import, AI
├── customers.csv              # Small sample input
├── valid_customers.csv         # Sample customer data
└── docker-compose.yml
\`\`\`

## Requirements

- Node.js and npm
- MySQL 8, or Docker with Docker Compose
- A Firebase project configured for the authentication flow
- A Groq API key for AI-assisted column mapping

## Local Setup

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/kmanaswini6/smart-data-importer.git
cd smart-data-importer
\`\`\`

### 2. Configure the backend

Create \`backend/.env\` with your own local database and service configuration:

\`\`\`env
PORT=5000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=smart_data_importer
JWT_SECRET=replace_with_a_long_random_secret
GROQ_API_KEY=your_groq_api_key
\`\`\`

Place your Firebase Admin service-account JSON file at \`backend/serviceAccountKey.json\`, as expected by the current backend middleware. Do not commit this file or any real credentials.

Create the database user and grant it access to the \`smart_data_importer\` database, or use the included Docker Compose setup after replacing its example credentials with local values. Do not use development credentials in a public deployment.

### 3. Configure the frontend

Create \`frontend/.env.local\` and provide the Firebase client configuration used by \`frontend/src/firebase.js\`:

\`\`\`env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
\`\`\`

The current frontend calls the backend at \`http://localhost:5000\`. Update that base URL in \`frontend/src/App.jsx\` if you run the API elsewhere.

### 4. Install dependencies

In one terminal:

\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

In another terminal:

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Open the local URL printed by Vite, typically \`http://localhost:5173\`.

## Configuration Notes

- Groq-based mapping requires a valid \`GROQ_API_KEY\`. If the AI request fails, the upload route is designed to return mappings that can be assigned manually.
- The main import API verifies Firebase ID tokens, so Firebase client configuration and the backend service-account credentials must match the same Firebase project.
- The backend initializes the MySQL tables when its database connection is available.
- The frontend currently uses a local API URL in its request handlers; deployment requires configuring the API URL for the target environment.

## Project Status

This is an in-progress MVP. The repository contains the core upload, mapping, validation, persistence, and report components, but the full workflow depends on correct MySQL, Firebase, and optional Groq configuration. Validate the application in your own environment before relying on it for production data.

## Potential Next Steps

- Add automated tests for CSV parsing, mapping, validation, and import edge cases
- Make frontend API configuration environment-based
- Improve upload-size limits, temporary-file cleanup, and error recovery
- Add end-to-end tests for authentication and the full import workflow
- Replace hard-coded development credentials in the Docker Compose and authentication code with required environment variables
- Add screenshots and a short demo after verifying the full workflow
