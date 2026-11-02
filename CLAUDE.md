# Apartment Dashboard

Roommates' chore board: recurring tasks with due tracking, assignment and a display-board view. React front end and an Express + MongoDB API, both under `apartment-dashboard-react/`. Words: `GLOSSARY.md`; decisions: `docs/adr/`.

## Stack and commands
Run everything from `apartment-dashboard-react/`.
- Front end: React 19, Vite 7, Tailwind 4, React Query, React Router. `npm ci`, `npm run lint` (ESLint), `npm test` (Vitest, `vitest run`), `npm run build`. All three pass before a PR.
- Back end `backend/`: Node + Express + Mongoose, JWT auth. `npm start`, `npm run dev` (port 3000) and `npm test` (`vitest run`) from `backend/`; run its tests too when you touch it.
- Dev: `npm run dev` (Vite) with the API running from `backend/`. Backend config via `.env` copied from `backend/env.example`; never commit it.

## Layout
- `src/components/` screens and shared UI; `src/services/` and `src/lib/` API calls; `src/contexts/`, `src/hooks/` shared state.
- `backend/` routes, models, auth middleware; its tests beside the code.
- `docs/agents/` tracker and label rules; `docs/adr/` decisions.

## Danger zones
- Auth and JWT handling: a change there needs a test for the failing path (expired, missing, wrong user) before the passing one.
- Anything that stores or shows a roommate's personal data (email, name) is a privacy question: the user decides, with a question card.
- The display board runs unattended on a wall screen: no layout may depend on hover or mouse; verify at 1920x1080 and in the browser's kiosk mode.

## Conventions
- Issues and board: `Fazorath/Apartment-Dashboard`, "Apartment Dashboard Roadmap" (#6, Status + Priority). Labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
- Branch `<n>-<slug>` (older branches are `feat-<n>-<slug>`; either is fine, pick the first for new work).
- UI is design work: load `design-rules` before choosing a font, colour or layout; keep the dark theme and the existing Tailwind tokens.
