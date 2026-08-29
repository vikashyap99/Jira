# Jira

A lightweight, Jira-style ticket/project management system.

**Stack:** Node.js + Express + MongoDB (Mongoose) · React (Vite) + Zustand

## Features
- **Workspaces** — top-level containers, each with its own boards, columns, tickets, and members
- **Auth** — email + password (bcrypt), JWT access + refresh tokens, optional phone field (groundwork for future phone/OTP login)
- **Roles** per workspace: `owner`, `reviewer`, `member`
- **Email notifications** (decoupled, non-blocking): welcome, workspace invite, ticket assigned, status changed, new comment
- **Boards & columns** — customizable, reorderable (drag & drop via @dnd-kit), default: To Do / In Progress / In Review / Done
- **Tickets** — title, description, column, assignees, reporter, priority, labels, due date, comments, attachments stub
- **Filtering, sorting & pagination** on ticket lists

## Repository Layout
```
Jira/
├── server/    # Express + Mongoose backend (CommonJS)
└── client/    # React (Vite) SPA
```

## Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

## Setup

### 1. Backend (`server/`)
```bash
cd server
npm install
cp .env.example .env    # then edit .env with your MONGODB_URI + JWT secrets
npm run dev             # starts server on http://localhost:5001 (nodemon)
```

### 2. Frontend (`client/`)
```bash
cd client
npm install
cp .env.example .env    # VITE_API_URL defaults to http://localhost:5001/api
npm run dev             # starts on http://localhost:5173
```

### 3. Seed sample data (optional)
```bash
cd server
npm run seed
```
This creates sample users (password `password123`):
- `owner@example.com` — workspace owner
- `reviewer@example.com` — reviewer
- `member@example.com` — member

...along with a sample workspace, board, columns, tickets, and comments.

## Environment Variables

### Backend (`server/.env`)
| Variable | Description |
| -------- | ----------- |
| `PORT` | Server port (default 5001 — note: macOS uses 5000 for Control Center) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets (must change in prod) |
| `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` | e.g. `15m` / `7d` |
| `CLIENT_URL` | Frontend origin (CORS) |
| `EMAIL_ENABLED` | `true`/`false` — master switch for email |
| `EMAIL_PROVIDER` | `smtp` \| `sendgrid` \| `mailgun` |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` | SMTP credentials |
| `SENDGRID_API_KEY` | SendGrid key (if provider = sendgrid) |
| `MAILGUN_API_KEY`/`MAILGUN_DOMAIN` | Mailgun config (if provider = mailgun) |

> **Email:** with `EMAIL_ENABLED=false`, emails are logged/skipped so development is never blocked. When enabled, pick a provider and fill the matching credentials. Email sending is queued via an event emitter so it never blocks the request/response cycle.

### Frontend (`client/.env`)
| Variable | Description |
| -------- | ----------- |
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:5001/api` |

## API Response Format
Every endpoint returns `{ success, data }` on success or `{ success, error: { message, status } }` on failure.

## Main Routes
- `/api/auth` — signup, login, refresh, logout, me, update me
- `/api/workspaces` — list/create/update/delete workspaces, join by invite code
- `/api/workspaces/:id/members` — member list, invite, role change, remove
- `/api/boards` — boards
- `/api/boards/:boardId/columns` — column CRUD + reorder
- `/api/columns/:id` — update/delete a column
- `/api/tickets` — list (filter/sort/paginate), create, get, update, move, delete
- `/api/tickets/:ticketId/comments` — comments

## Scripts
| Location | Command | Purpose |
| -------- | ------- | ------- |
| `server` | `npm run dev` | Start backend (nodemon) |
| `server` | `npm start` | Run backend |
| `server` | `npm run seed` | Seed sample data |
| `client` | `npm run dev` | Start Vite dev server |
| `client` | `npm run build` | Production build |
| `client` | `npm run preview` | Preview production build |
