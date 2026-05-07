# Project Manager

A modern, full-stack project management application with Kanban boards, real-time collaboration, and team workspace management. Built with a calm, nature-inspired design system.

![Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![Stack](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel) ![Stack](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase) ![Stack](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)

---

## Features

**Workspaces & Team Management**
- Create multiple workspaces, each with its own projects and members
- Invite teammates by email with tokenized invitation links
- Role-based access control — Owner, Admin, and Member roles
- Owners and admins can update roles or remove members

**Kanban Boards**
- Every project gets a board with four default columns: To Do, In Progress, In Review, Done
- Drag and drop tasks between columns and reorder columns themselves
- Add custom columns with a name and accent colour
- Filter tasks by priority, assignee, or overdue status

**Tasks**
- Rich task cards showing priority badge, due date, and assignee avatars
- Task detail drawer with editable title, rich-text description (Tiptap editor), priority selector, due date picker, and multi-assignee picker
- File attachments stored in Supabase Storage (up to 20 MB per file)
- Comment threads on each task
- Full activity log tracking every change — created, moved, assigned, commented, etc.

**Dashboard**
- Personalised daily brief — overdue count, tasks due today, completed this week
- Focus strip surfacing the 3 highest-urgency tasks for the day
- Stat cards for assigned, overdue, and upcoming tasks
- Project progress bars (active + on-hold projects, archived excluded)
- Live team activity feed showing recent actions across all workspaces

**My Tasks**
- Weekly calendar strip with per-day task dots coloured by priority
- Today's progress bar (tasks due today done vs total)
- Tasks grouped by horizon: Overdue → Today → Tomorrow → This Week → Later
- Pill-style sort toggle (by priority or by due date)
- Click any task row to jump straight to its board

**Auth & Profile**
- Register, login, logout via Laravel Sanctum token auth
- Update display name, email, and upload a profile avatar
- Invitation links work before and after login — token is preserved through the auth flow

**Real-time**
- Supabase Realtime subscriptions on the `tasks`, `task_comments`, and `task_assignees` tables
- Board updates pushed live to all connected clients without a page refresh

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TailwindCSS 4 |
| Routing | React Router v7 |
| Server state | TanStack Query v5 |
| Drag and drop | dnd-kit (core + sortable) |
| Rich text | Tiptap v3 (StarterKit + Placeholder) |
| HTTP client | Axios |
| Date utilities | date-fns v4 |
| Toasts | react-hot-toast |
| Icons | Heroicons v2 |
| Backend | Laravel 13, PHP 8.3 |
| Auth | Laravel Sanctum (token-based) |
| Database | Supabase (PostgreSQL) |
| File storage | Supabase Storage |
| Real-time | Supabase Realtime |
| Testing | Pest v4 |

---

## Project Structure

```
project-management-app/
├── frontend/
│   └── src/
│       ├── api/              # Axios API call modules (auth, tasks, boards, …)
│       ├── components/
│       │   ├── board/        # KanbanColumn, TaskCard
│       │   ├── layout/       # AppLayout, Sidebar, Topbar, ProtectedRoute
│       │   ├── task/         # TaskDrawer, TaskComments, TaskAttachments
│       │   └── ui/           # UserAvatar, SearchBar, NotificationBell, …
│       ├── hooks/            # Shared custom hooks
│       ├── lib/
│       │   ├── axios.js      # Axios instance (base URL + auth header + 401 redirect)
│       │   └── supabase.js   # Supabase client for Realtime subscriptions
│       ├── pages/            # One file per route
│       └── store/
│           └── AuthContext.jsx
└── backend/
    ├── app/
    │   ├── Http/Controllers/Api/   # One controller per resource
    │   └── Models/                 # Eloquent models with UUID primary keys
    ├── database/migrations/        # 11 ordered migrations
    └── routes/api.php
```

---

## Database Schema

```
users
  └─< workspace_members >─ workspaces
                                └─< projects
                                        └── boards
                                              └─< board_columns
                                                      └─< tasks
                                                            ├─< task_assignees >─ users
                                                            ├─< task_comments
                                                            ├─< task_attachments
                                                            └─< activity_logs
```

All primary keys are UUIDs. Soft deletes on `workspaces`, `projects`, `tasks`, and `task_comments`.

---

## Getting Started

### Prerequisites

- PHP 8.3+ and Composer
- Node.js 20+
- A [Supabase](https://supabase.com) project with:
  - The PostgreSQL connection string
  - Anon key and Service Role key
  - A storage bucket named `attachments` (set to public)
  - Realtime enabled on the `tasks`, `task_comments`, and `task_assignees` tables

---

### Backend setup

```bash
cd backend

# Install PHP dependencies
composer install

# Copy and configure environment
cp .env.example .env
php artisan key:generate
```

Edit `backend/.env`:

```env
APP_NAME="Project Manager"
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=<your-supabase-host>
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=<your-supabase-password>

SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>
SUPABASE_BUCKET=attachments

QUEUE_CONNECTION=database
MAIL_MAILER=log          # or configure smtp for real invitation emails
```

```bash
# Run all migrations (creates 11 tables)
php artisan migrate

# Start the dev server + queue worker together
composer dev
```

> `composer dev` uses `concurrently` to run `php artisan serve`, `php artisan queue:listen`, and `npm run dev` in one terminal.

---

### Frontend setup

```bash
cd frontend

# Install JS dependencies
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

```bash
npm run dev
```

The app is now available at **http://localhost:5173**.

---

### Supabase — Row Level Security

Run the following in the Supabase SQL editor to restrict data access by workspace membership:

```sql
-- Enable RLS
ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments     ENABLE ROW LEVEL SECURITY;

-- Workspaces: visible to members only
CREATE POLICY "workspace_member_access" ON workspaces
FOR ALL USING (
  id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Tasks: visible to members of the containing workspace
CREATE POLICY "task_workspace_member_access" ON tasks
FOR ALL USING (
  column_id IN (
    SELECT bc.id FROM board_columns bc
    JOIN boards b      ON b.id = bc.board_id
    JOIN projects p    ON p.id = b.project_id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);
```

---

## API Overview

All endpoints (except register, login, and invitation preview) require a `Bearer` token in the `Authorization` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login, returns token |
| POST | `/api/auth/logout` | Invalidate current token |
| GET | `/api/auth/me` | Get authenticated user |
| PATCH | `/api/auth/profile` | Update name / email |
| POST | `/api/auth/avatar` | Upload avatar |
| GET | `/api/workspaces` | List user's workspaces |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces/:id/members` | List workspace members |
| POST | `/api/workspaces/:id/invite-by-email` | Send invitation email |
| GET | `/api/workspaces/:id/projects` | List projects |
| POST | `/api/workspaces/:id/projects` | Create project (auto-creates board + 4 columns) |
| GET | `/api/projects/:id/board` | Get board with columns |
| POST | `/api/projects/:id/board/columns` | Add a column |
| PATCH | `/api/columns/reorder` | Reorder columns |
| GET | `/api/boards/:id/tasks` | Get tasks grouped by column |
| POST | `/api/columns/:id/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update task fields |
| PATCH | `/api/tasks/:id/move` | Move task to a different column/position |
| POST | `/api/tasks/:id/assignees` | Assign a user |
| DELETE | `/api/tasks/:id/assignees/:userId` | Unassign a user |
| GET | `/api/tasks/:id/activity` | Get task activity log |
| POST | `/api/tasks/:id/attachments` | Upload attachment (multipart) |
| GET | `/api/me/tasks` | All tasks assigned to the current user |
| GET | `/api/dashboard` | Dashboard summary (tasks, activity, project progress) |
| GET | `/api/search` | Global search across tasks and projects |

---

## Production Checklist

- [ ] Set `APP_ENV=production` and `APP_DEBUG=false` in `.env`
- [ ] Run `php artisan config:cache && php artisan route:cache`
- [ ] Run `npm run build` and serve the `dist/` folder
- [ ] Ensure the queue worker is running: `php artisan queue:work --daemon`
- [ ] Restrict CORS `allowed_origins` to your production domain in `config/cors.php`
- [ ] Enable RLS policies in Supabase (see above)
- [ ] Set file upload size limits in your web server config (default: 20 MB)
- [ ] Configure a real mail driver (`MAIL_MAILER=smtp`) for invitation emails

---

## Design System

The UI uses a four-colour nature-inspired palette:

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Cream | `#F6E3C5` | Page background, sidebar, card surfaces |
| Sage Green | `#A0D995` | Success states, Done column, positive badges |
| Teal Mint | `#6CC4A1` | Secondary buttons, column accents, hover states, tag chips |
| Ocean Blue | `#4CACBC` | Primary CTA buttons, links, active highlights |

Typography uses **DM Sans** with dark charcoal (`#2C2C2C`) for headings and medium gray (`#6B6B6B`) for body text. Border radius is 8 px on inputs, 12 px on cards, and 16 px on modals and panels.

---

## License

MIT
