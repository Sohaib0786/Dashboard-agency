# Agency Project Dashboard

A full-stack real-time project management dashboard for agencies — with role-based access control, live WebSocket activity feeds, JWT authentication, and a background job scheduler.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development Setup](#local-development-setup)
- [Database Schema](#database-schema)
- [Architectural Decisions](#architectural-decisions)
- [API Overview](#api-overview)
- [Seed Credentials](#seed-credentials)
- [Known Limitations](#known-limitations)
- [Submission Explanation](#submission-explanation)

---

## Features

- **JWT Auth** — 15-minute access tokens + 7-day HttpOnly cookie refresh tokens with rotation
- **Three roles** — Admin, Project Manager, Developer — enforced at the API layer on every route
- **Real-time activity feed** — Socket.io with project rooms, role-filtered emit, offline catch-up from DB
- **Live notification badge** — unread count updates via WebSocket, not polling
- **Overdue task scheduler** — node-cron job runs every hour, flags tasks, writes activity log
- **URL-shareable filters** — all task filters are query parameters (`?status=IN_PROGRESS&priority=HIGH`)
- **Presence tracking** — live online user count shown to admins via WebSocket
- **Pre-seeded data** — 7 users, 3 clients, 3 projects, 17 tasks, pre-written activity logs


## Tech Stack
-----------------------------------------------
| Layer      | Choice                         |
|------------|--------------------------------|
| Frontend   | React 18 + TypeScript + Vite   |
| Styling    | Tailwind CSS                   |
| State      | Zustand + TanStack Query       |
| Backend    | Node.js + Express + TypeScript |
| Database   | PostgreSQL 16                  |
| ORM        | Prisma                         | 
| Real-time  | Socket.io                      |
| Auth       | JWT (jsonwebtoken) + bcrypt    |
| Scheduler  | node-cron                      |
| Validation | express-validator              |
| Logging    |Winston                         |
| Container  | Docker + Docker Compose        | 
-----------------------------------------------


## Quick Start (Docker)

```bash
git clone <repo-url>
cd agency-dashboard
docker compose up --build
```

The compose file will:
1. Start PostgreSQL
2. Run `prisma migrate deploy` + seed script
3. Start the Express API on port 3001
4. Build and serve the React app on port 5173 via Nginx

Open **http://localhost:5173** and log in with any seed account (see below).

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running locally

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT secrets

npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run dev
# API at http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App at http://localhost:5173
```

Vite proxies `/api` and `/socket.io` to `localhost:3001` automatically.

---

## Database Schema

### Entity Relationship Overview

```
User (id, name, email, password, role, isOnline)
  ├── managedProjects → Project[]
  ├── assignedTasks   → Task[]
  ├── activityLogs    → ActivityLog[]
  ├── notifications   → Notification[]
  └── refreshTokens   → RefreshToken[]

Client (id, name, email, company)
  └── projects → Project[]

Project (id, name, description, clientId, managerId)
  ├── client       → Client
  ├── manager      → User
  ├── tasks        → Task[]
  └── activityLogs → ActivityLog[]

Task (id, title, description, projectId, assigneeId, status, priority, dueDate, isOverdue)
  ├── project      → Project
  ├── assignee     → User
  ├── activityLogs → ActivityLog[]
  └── notifications → Notification[]

ActivityLog (id, userId, projectId, taskId, action, fromValue, toValue, createdAt)
  — stored as immutable records, never derived

Notification (id, recipientId, taskId, type, message, isRead)

RefreshToken (id, token, userId, expiresAt)
```

### Index Decisions

| Table | Indexed Columns | Reason |
|----------    |---          |---|
| User         | email, role  | Login lookup + role filtering |
| Task         |  projectId, assigneeId | Join-heavy queries on project/developer views |
| Task         | status, priority | Filter queries (the most common UI operations) |
| Task         | dueDate, isOverdue | Overdue job + date range filters |
| ActivityLog  | projectId, taskId, userId | Feed queries filtered by project/task/user |
| ActivityLog  | createdAt | Time-sorted feed fetches |
| Notification | recipientId, isRead | Per-user unread count queries |
| RefreshToken | token, userId | Token lookup + cascade delete |

---

## Architectural Decisions

### WebSocket: Socket.io over native WebSocket

**Choice:** Socket.io 4.x

**Reasoning:**
- Built-in room abstraction maps perfectly to the "project room" model — users join a room per project, and events are scoped to that room without manual tracking
- Authentication middleware via `io.use()` lets us verify JWTs before the handshake completes, rejecting unauthorized sockets at the transport layer
- Automatic reconnection with exponential backoff — critical for the "offline catch-up" requirement; we hook into the reconnect event to re-join project rooms and refetch missed activity from DB
- Namespace support for future expansion (e.g., `/admin` namespace)
- Native WebSocket would require building all of this manually

**Role-filtered emit logic:**
- Every activity event is emitted to the relevant `project:{id}` room (all viewers of that project)
- Simultaneously emitted to Admin sockets directly (global feed)
- For PM-scoped activity, we look up the project's `managerId` and emit to that user's socket set
- For developer-scoped activity, we look up the task's `assigneeId` and emit to their sockets
- This means a Developer only receives WebSocket events for tasks assigned to them — matching the API-level restriction

### Background Jobs: node-cron over Bull

**Choice:** node-cron

**Reasoning:**
- Bull requires Redis as a dependency, adding significant operational complexity (another service to deploy, monitor, and backup) for a single scheduled task that runs once per hour
- node-cron is self-contained — it runs in-process without external dependencies
- The overdue task job is idempotent and low-stakes if it skips an execution (no retry/failure tracking needed)
- Bull's strengths (distributed processing, job queues, worker pools, retry strategies) are valuable for high-throughput async work — not a cron rule that runs a single `UPDATE` query
- If the workload grew to require email queuing, PDF generation, or distributed processing, migrating to Bull would be the right call

### Token Storage

**Access Token:** Stored in memory (Zustand store), never in localStorage
- XSS-safe: a malicious script cannot read it from storage
- Lost on tab close / refresh — mitigated by the refresh flow

**Refresh Token:** HttpOnly, Secure, SameSite=Strict cookie
- Inaccessible to JavaScript — immune to XSS
- SameSite=Strict prevents CSRF on the `/auth/refresh` endpoint
- 7-day expiry with rotation on every use (old token is deleted, new one issued)

**Refresh flow:** The Axios interceptor catches 401 responses, transparently calls `/auth/refresh`, updates the in-memory token, and retries the original request — invisible to the user.

### ORM: Prisma

- Type-safe queries with full TypeScript inference
- Migration history tracked in version control
- `prisma generate` keeps client in sync with schema changes
- Raw SQL is an escape hatch via `prisma.$queryRaw` when needed

### Validation

All API inputs are validated server-side with `express-validator` before reaching any controller. Frontend validation is supplementary UX only. A Developer cannot bypass role checks by crafting raw HTTP requests — the JWT payload's `role` field is what controls access, verified on every protected route.

### Error Handling

All endpoints return `{ success: boolean, data?, error?, message? }`. Raw stack traces are never exposed to clients — the global error handler logs the full error internally via Winston and returns a generic 500 message.

---

## API Overview

```
POST   /api/auth/login          Public
POST   /api/auth/refresh        Public (uses HttpOnly cookie)
POST   /api/auth/logout         Authenticated
GET    /api/auth/me             Authenticated

GET    /api/dashboard           Authenticated (role-aware response)

GET    /api/projects            Admin + PM (PM sees own only)
POST   /api/projects            Admin + PM
GET    /api/projects/:id        Admin + PM (PM: own only)
PATCH  /api/projects/:id        Admin + PM (PM: own only)
DELETE /api/projects/:id        Admin only

GET    /api/tasks               Authenticated (role-filtered)
POST   /api/tasks               Admin + PM
GET    /api/tasks/:id           Authenticated (role-filtered)
PATCH  /api/tasks/:id/status    Authenticated (Dev: own tasks only)
PATCH  /api/tasks/:id           Admin + PM
DELETE /api/tasks/:id           Admin + PM

GET    /api/activity            Authenticated (role-filtered)

GET    /api/notifications       Authenticated
PATCH  /api/notifications/:id/read    Authenticated
PATCH  /api/notifications/read-all   Authenticated

GET    /api/users               Admin only
POST   /api/users               Admin only
GET    /api/users/developers    Admin + PM
GET    /api/clients             Admin + PM
POST   /api/clients             Admin + PM
```

### Task Filters (query params, URL-shareable)

```
GET /api/tasks?status=IN_PROGRESS&priority=HIGH&dueDateFrom=2025-01-01&dueDateTo=2025-03-31&projectId=xxx
```

All filters are composable and work identically in the frontend URL bar.

---

## Seed Credentials

|     Role        |     Email         | Password |
|-----------------|-------------------|---|
| Admin           | admin@agency.dev | Admin@123 |
| Project Manager | sarah@agency.dev | Pm1@1234 |
| Project Manager | marcus@agency.dev | Pm2@1234 |
| Developer       | ravi@agency.dev | Dev1@123 |
| Developer       | lena@agency.dev | Dev2@123 |
| Developer       | james@agency.dev | Dev3@123 |
| Developer       | priya@agency.dev | Dev4@123 |

**Pre-seeded state:**
- 3 clients (Nova Commerce, HealthSync, UrbanFlow)
- 3 projects with 5–6 tasks each
- 2 tasks already in OVERDUE state (dueDate in the past, isOverdue=true)
- 12 activity log entries pre-written
- 5 notifications (mix of read/unread)

---

## Known Limitations

1. **No horizontal scaling without Redis adapter** — Socket.io's in-memory room store means multiple backend instances won't share room state. Adding `@socket.io/redis-adapter` would fix this.

2. **Refresh token not invalidated on password change** — If a user's password is changed, existing refresh tokens remain valid until expiry. A `passwordChangedAt` field on User + check in the refresh handler would close this.

3. **No file attachments** — Task descriptions are text-only. S3 integration would be needed for attachments.

4. **Overdue job runs in-process** — If the Node process restarts, a scheduled execution may be skipped. A persistent job store (Bull + Redis) would guarantee execution.

5. **No pagination on activity feed** — The feed fetches a fixed `limit` rather than supporting cursor-based infinite scroll. This is fine for the current data volume.

6. **Developer can see project name via task** — Developers see the project name on their assigned task cards. This is intentional UX, not a data leak — they cannot fetch the full project record.

---

### Submission Explanation

### The Hardest Problem: Role-Filtered Real-Time Feed

The toughest part for me was handling real-time activity updates based on user roles. I didn’t want to create separate Socket.io namespaces for each role because that would make things more complicated to manage.

So instead, I used a simple approach on the server side. Whenever an activity happens, I send it to multiple places:

* First, to the project room (`project:{id}`) so anyone currently viewing the project gets it.
* Second, to all Admin users so they can see everything in the global feed.
* Third, to the Project Manager by finding their ID from the database and sending it to their socket.

For developer-specific events, I also check who the task is assigned to and send the event only to that developer.

So basically, filtering happens on the server side itself. Developers only receive events related to their tasks, just like how API access is controlled.

---

### Offline Catch-Up

When a user reconnects, the server sends them the last 20 activities based on their role:

* Developers get activities related to their tasks
* Project Managers get activities from their projects
* Admins get everything

These are sent as an `activity:catchup` event, and on the frontend I make sure to avoid duplicates if some events are already there.

---

### One Thing I'd Do Differently

If I had more time, I would implement cursor-based pagination instead of just fetching the last 20 records.

Right now, if a user was offline for a long time, they only see the latest 20 activities and miss older ones. With a cursor-based approach (using last seen ID or timestamp), users could load older data properly without performance issues.
