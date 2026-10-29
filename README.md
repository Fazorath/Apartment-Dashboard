# Apartment Dashboard

A modern, collaborative task management dashboard built with React, Vite, and Node.js. Perfect for roommates to track recurring chores and tasks.

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
- **User Authentication**: Secure login/register system with JWT tokens
- **Task Management**: Create, edit, delete, and mark tasks as complete
- **Recurring Tasks**: Set frequency in days with automatic due date tracking
- **Collaboration**: Assign tasks to specific roommates
- **Real-time Statistics**: Track overdue, due soon, and total tasks
- **Advanced Filtering**: Filter by status (all, overdue, due soon, OK)
- **Search**: Find tasks quickly with real-time search
- **Modern UI**: Beautiful, responsive design with dark theme
- **Dynamic Headers**: Dashboard title updates with apartment name
- **Responsive**: Works perfectly on desktop and mobile

## Tech stack
### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

---

## Quick start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Apartment-Dashboard
```

### 2. Frontend Setup
```bash
cd apartment-dashboard-react
npm install
npm run dev
# app runs at http://localhost:5173
```

### 3. Backend Setup
```bash
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
    README.md              # Detailed implementation docs
```

Key entry points:
- Frontend: `apartment-dashboard-react/src/main.jsx`
- Backend: `apartment-dashboard-react/backend/server.js`

---

## Configuration
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

### Available Scripts

**Frontend** (run inside `apartment-dashboard-react`):
- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview production build

**Backend** (run inside `apartment-dashboard-react/backend`):
- `npm run dev` – start API with nodemon
- `npm start` – start API with Node

---

## Roadmap / status

### ✅ Completed Features
- User authentication with JWT
- Task CRUD operations
- Recurring task management
- Real-time statistics
- Dynamic apartment-specific headers
- Responsive dark theme UI
- Multi-apartment support
- Pinned chores sort to the top of their group
- Sort-By control for the chore list
- Chore priority (Low / Normal / High)
- Chore list shown first on mobile
- Narrower search bar
- Detail drawer shows only the Notes section (no separate description)
- Backend API test harness
- Stronger password rules
- Email verification
- Forgot password flow
- Sign in with Google
- Sign in with Apple
- Optional two-factor login (authenticator app)
- Living-room Display: pair a TV as a read-only view, with status, unpairing and rate-limited pairing, a dim at night (23:00 to 07:00) and a small layout shift against burn-in

**Setting up the Display on a Fire TV:** open `/display` in Silk and pair it from Settings. Set the Fire TV screensaver to **Never** (Settings → Display & Sounds → Screensaver → Start Time), since a web page can't change that. The page asks the browser to keep the screen awake where it can.

### 🚧 In Progress / Planned
Work is tracked on the [Apartment Dashboard Roadmap](https://github.com/users/Fazorath/projects/6) board.

- **Living-room Display** ([#40](https://github.com/Fazorath/Apartment-Dashboard/issues/40))
- **Self-hosting on the home server** ([#49](https://github.com/Fazorath/Apartment-Dashboard/issues/49))

### 🔧 Known Issues
- None at the moment.

---

## Contributing
1) Fork the repo and create a feature branch
2) Make your changes with clear commit messages
3) Add/update docs or tests where helpful
4) Open a pull request

---

## License
MIT
