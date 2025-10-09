# Apartment Dashboard

Collaborative dashboard for recurring chores and household tasks — React + Node.js + MongoDB.

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Stack: React](https://img.shields.io/badge/stack-React%20%2B%20Vite-blue)
![Backend: Express](https://img.shields.io/badge/backend-Express%20%2B%20MongoDB-orange)

Note: All application code lives under `apartment-dashboard-react/`.

### Why this project
This is one of my first fully built apps. The goal is to demonstrate end‑to‑end delivery: clean UI/UX, a working backend, real authentication, and clear documentation so others can run it easily.

---

## Table of contents
- Overview
- Features
- Tech stack
- Quick start
- Project structure
- Configuration
- Roadmap
- Contributing
- License

## Overview
Apartment Dashboard helps roommates stay on top of recurring chores with task assignments, due tracking, and simple collaboration — powered by a React frontend, and a Node.js/Express API with MongoDB for persistence and JWT authentication.

## Features
- Task creation, assignment, completion, and recurrence
- Status filters (overdue, due soon, OK), search, and quick stats
- Modern responsive UI with dark theme
- Authentication (full‑stack version): register/login with JWT

## Tech stack
- Frontend: React, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt

---

## Quick start (full‑stack)
1) Frontend
   ```sh
   cd apartment-dashboard-react
   npm install
   npm run dev
   # app runs at http://localhost:5173
   ```

2) Backend
   ```sh
   cd apartment-dashboard-react/backend
   npm install
   cp env.example .env
   # edit .env with your values (see Configuration)
   npm run dev
   # API runs at http://localhost:3000
   ```

---

## Project structure
```text
Apartment-Dashboard/
  apartment-dashboard-react/
    src/                   # React app (components, contexts, services)
    backend/               # Express API (auth, tasks, users)
    README.md              # React/Backend specific docs
```

Key entry points:
- Frontend: `apartment-dashboard-react/src/main.jsx`
- Backend: `apartment-dashboard-react/backend/server.js`

---

## Configuration (full‑stack)
Create `apartment-dashboard-react/backend/.env` from `env.example`:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority

# JWT Secret (use a strong, random value)
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173
```

Frontend scripts (run inside `apartment-dashboard-react`):
- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview production build

Backend scripts (run inside `apartment-dashboard-react/backend`):
- `npm run dev` – start API with nodemon
- `npm start` – start API with Node

---

## Roadmap / status
- Forgot password flow (not implemented yet)
  - Password reset emails and tokens
  - Backend endpoints for request/reset
  - Frontend reset screens
- Social sign‑in (Google, Apple)
- Email verification and stronger password requirements
- Optional 2FA

See `apartment-dashboard-react/README.md` for a detailed implementation checklist.

---

## Contributing
1) Fork the repo and create a feature branch
2) Make your changes with clear commit messages
3) Add/update docs or tests where helpful
4) Open a pull request

---

## License
MIT
