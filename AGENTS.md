# AGENTS.md — Jira (Lightweight Jira-Style Ticket System)

This file guides AI agents and contributors working on this codebase. Read it before making changes.

## Project Overview

A lightweight, Jira-style ticket/project management system built on a MERN-adjacent stack:
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Frontend:** React (Vite) + Zustand
- **Database:** MongoDB

The product is intentionally lightweight and pragmatic, not enterprise-scale Jira.

### Core Concept
A **Workspace** is the top-level container. Each workspace has its own boards, columns, tickets, and members. A user can belong to multiple workspaces with different roles in each.

## Repository Layout

```
Jira/
├── AGENTS.md            # This file
├── README.md            # Setup + run instructions
├── server/              # Express + Mongoose backend (CommonJS)
│   ├── package.json
│   ├── .env.example
│   ├── .env             # Local secrets (NOT committed)
│   ├── src/
│   │   ├── index.js         # App entry + server boot
│   │   ├── app.js           # Express app (middleware + routes)
│   │   ├── config/
│   │   │   ├── db.js        # Mongoose connection
│   │   │   └── env.js       # env loading + validation
│   │   ├── models/          # Mongoose schemas
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # Express routers
│   │   ├── middleware/      # auth, roles, error handling
│   │   ├── services/
│   │   │   └── email/       # Nodemailer + email templates (decoupled)
│   │   ├── utils/           # apiResponse, asyncHandler, etc.
│   │   └── seed/
│   │       └── seed.js      # Seed script
└── client/              # React (Vite) SPA
    ├── package.json
    ├── .env.example
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api/             # Centralized axios/fetch wrapper + interceptors
    │   ├── store/           # Zustand stores
    │   ├── context/         # React context (auth)
    │   ├── hooks/           # Custom hooks
    │   ├── components/      # Reusable UI components
    │   └── pages/           # Route-level pages
```

## Tech Decisions (per PRD)
- **Auth:** email + password (bcrypt), JWT access + refresh tokens. User schema has an optional `phone` field — NOT used for auth yet. Keep auth structured so phone/OTP login can be bolted on later without a rewrite.
- **Roles (per workspace):** `owner`, `reviewer`, `member`. Enforced via middleware.
- **Email:** Nodemailer with a pluggable transport (SMTP/SendGrid/Mailgun via env). Email sending is decoupled (event-emitter-based stub queue) so it never blocks the request/response cycle.
- **Boards/Columns:** Each workspace has boards; each board has ordered columns (default: To Do, In Progress, In Review, Done). Columns are reorderable.
- **Tickets:** title, description, status (column ref), assignee(s), reporter, priority, labels, due date, timestamps, comments, optional attachments.
- **State management:** Zustand (kept simple), with React Context for auth.
- **Drag & drop:** `@dnd-kit` for Kanban reordering (order persisted via order field).
- **Validation:** backend — Joi; frontend — form validation (hand-rolled / simple).
- **API response format:** `{ success, data, error }` for all responses.
- **Pagination** on ticket lists.

## Conventions

### API Response Format
Every endpoint returns a consistent envelope:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "message": "...", "status": 400 } }
```
Use the helper in `server/src/utils/apiResponse.js` — do NOT hand-roll response shapes.

### Error Handling
- Route handlers wrap async logic with `asyncHandler` (see `server/src/utils/asyncHandler.js`).
- Thrown errors flow to the centralized error middleware in `server/src/app.js`.
- Validation errors from Joi are normalized to the standard `{ success, error }` shape.

### Routing
RESTful resource routes (see `server/src/routes/`):
- `/auth`
- `/workspaces`
- `/workspaces/:id/members`
- `/boards`, `/boards/:id/columns`
- `/tickets`, `/tickets/:id/comments`

### Database
- Use references (`ObjectId`) between collections — no deep nesting except small embedded arrays like column order.
- Collections: `User`, `Workspace`, `WorkspaceMember`, `Board`, `Column`, `Ticket`, `Comment`.

### Roles & Permissions
- `owner` — full control: workspace settings, invite/remove members, assign roles, delete boards/tickets.
- `reviewer` — review/approve tickets (move in/out of "In Review", comment). Cannot manage workspace/members.
- `member` — create/edit/move own tickets, comment; limited on others' tickets; no admin.

Route-level role checks live in `server/src/middleware/`. When a route is owner-only, reference the real middleware helpers instead of duplicating checks.

## Environment Variables
Backend (`server/.env` — see `server/.env.example`):
- `PORT`, `MONGODB_URI`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- `CLIENT_URL` (CORS + email links)
- Email: `EMAIL_PROVIDER` (smtp|sendgrid|mailgun), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SENDGRID_API_KEY`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
- `EMAIL_ENABLED` (`true`/`false`) to toggle email sending.

Frontend (`client/.env` — see `client/.env.example`):
- `VITE_API_URL` (backend base URL, e.g. `http://localhost:5000/api`)

## Commands

### Backend (`server/`)
```bash
npm install
npm run dev        # nodemon, watches src
npm start          # run (expects build)
npm run seed       # seed sample workspace/users/board/tickets
```

### Frontend (`client/`)
```bash
npm install
npm run dev        # Vite dev server
npm run build      # production build
npm run preview    # preview production build
```

## Working With This Codebase (for agents)
- Follow the existing file/folder conventions — put new files where the layout above dictates.
- Reuse the centralized API wrapper on the frontend (`client/src/api/client.js`) — never call fetch/axios ad hoc.
- Add Mongo models under `server/src/models`, controllers under `server/src/controllers`, routes under `server/src/routes`, and register the new router in `server/src/app.js`.
- Add frontend pages under `client/src/pages` and wire them via the router in `client/src/App.jsx`.
- Validate backend inputs with Joi (create reusable schemas under a shared file, not inline per controller).
- Keep dependencies minimal. Do not add libraries unless truly necessary.
- Never commit secrets. Only `.env.example` files are committed — real `.env` files stay local/git-ignored.
- After making changes, run the relevant server (`npm run dev`) to verify, and run `npm run build` on the client to catch errors.
