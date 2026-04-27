# [OpenHR — Open Source HRMS for Growing Teams](https://www.openhrapp.com/)

**[OpenHRApp](https://www.openhrapp.com/)** is [a free, open-source Human Resource Management System (HRMS)](https://www.openhrapp.com/) built for mid-size organizations (100–500 employees). It delivers biometric attendance tracking, intelligent leave management, performance reviews, and organizational tools — all in a lightweight, privacy-first package.

> Looking for **[free HR software](https://www.openhrapp.com/)** that's easy to self-host? [OpenHRApp](https://www.openhrapp.com/) is a modern **[open source HR management system](https://www.openhrapp.com/)** with zero infrastructure overhead.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/openhr/openhr/pulls)

---

## Why [OpenHRApp](https://www.openhrapp.com/)?

Most open source HRMS tools are bloated, hard to deploy, or stuck in the past. OpenHR is different:

- **Single-file backend** — PocketBase means no database clusters, no Docker compose files, no DevOps headaches
- **Modern stack** — React 19 + Tailwind CSS + TypeScript, not a legacy PHP monolith
- **Mobile-ready** — Installable PWA on iOS, Android, and desktop with offline-aware caching
- **Privacy-first** — Self-hosted, your employee data never leaves your server
- **Multi-tenant** — One instance can serve multiple organizations with full data isolation

---

## Key Features

### [Attendance Tracking (Biometric + GPS)](https://www.openhrapp.com/features/attendance-tracking)
- Selfie-verified clock in/out to prevent buddy punching
- GPS geofencing to validate employee location
- Office and factory/field duty types
- Auto-close forgotten sessions at end of workday

### [Leave Management](https://www.openhrapp.com/features/leave-management)
- Multi-tier approval workflows (Employee → Manager → HR)
- Real-time leave balance tracking (Annual, Sick, Casual, and custom types)
- Configurable department-level approval routing
- Automated email and in-app notifications at every step

### [Performance Reviews](https://www.openhrapp.com/features/performance-reviews)
- Configurable review cycles with competency-based ratings
- Self-assessment → Manager review → HR finalization pipeline
- Auto-calculated attendance and leave summaries per review period

### [Employee Directory & Organization Setup](https://www.openhrapp.com/features/employee-directory)
- Dynamic departments, designations, and team structures
- Role-based access control (Admin, HR, Manager, Team Lead, Employee)
- Centralized holiday calendar
- Shift management with grace periods and auto-close rules

### [Announcements & Notifications](https://www.openhrapp.com/features/gps-geofencing)
- Organization-wide announcements with role targeting and expiry
- Real-time notification bell + email alerts for leave, attendance, and review events

### [Reports & Analytics](https://www.openhrapp.com/features/reports-analytics)
- Attendance summaries and leave reports
- Exportable data for payroll integration

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Backend | [PocketBase](https://pocketbase.io) (Go-based, single-file DB + auth) |
| Mobile | Installable PWA (iOS Safari, Android Chrome, desktop) |
| Icons | Lucide React |
| Deployment | Vercel (frontend), any VPS (PocketBase) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/openhr/openhr.git
cd openhr
npm install
```

### 2. Set Up PocketBase

1. Download PocketBase from [pocketbase.io](https://pocketbase.io)
2. Start the server: `./pocketbase serve`
3. Copy all `.pb.js` files from `Others/pb_hooks/` into PocketBase's `pb_hooks/` folder

### 3. Run the App

```bash
npm run dev
```

Open the app and enter your PocketBase URL on the setup screen. Create your first Admin user in the PocketBase admin UI, then log in.

---

## Architecture

```
React 19 (Installable PWA)
    ↓
Custom Hooks → hrService (facade) → Domain Services → PocketBase SDK
    ↓
PocketBase (Go binary — single file, SQLite-based)
    ↓
pb_hooks/ (server-side JS — email, cron, workflows)
```

- **No React Router** — state-based routing for simplicity
- **Context + Event Bus** for state management (no Redux)
- **Multi-tenant** — every query scoped by `organization_id`
- **WebP auto-conversion** for all uploaded images

---

## PocketBase Collections

OpenHR uses these PocketBase collections:

| Collection | Purpose |
|-----------|---------|
| `users` | Employee accounts with role, department, designation |
| `organizations` | Multi-tenant org records with subscription status |
| `attendance` | Daily attendance with GPS, selfie, and duty type |
| `leaves` | Leave requests with multi-tier approval status |
| `shifts` | Shift definitions with grace periods |
| `teams` | Team records with leader assignments |
| `settings` | Key-value org configuration |
| `announcements` | Org announcements with role targeting |
| `notifications` | User notification records |
| `review_cycles` | Performance review cycle definitions |
| `performance_reviews` | Individual review records |
| `reports_queue` | Email automation queue |

See `Others/CLAUDE.md` for full collection schemas and API rules.

---

## Role-Based Access

| Role | Access Level |
|------|-------------|
| Admin | Full organization visibility and configuration |
| HR | Full employee data, leave approvals, review finalization |
| Manager | Team members' attendance, leave, and reviews |
| Team Lead | Direct reports only |
| Employee | Own data only |

---

## Contributing

We welcome contributions! Whether it's bug fixes, new features, or documentation improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

OpenHR is open source software licensed under the [MIT License](LICENSE).

---

## Keywords

`open source HRMS` · `free HR software` · `human resource management system` · `open source attendance tracking` · `leave management system` · `employee management software` · `self-hosted HR tool` · `PocketBase HRMS` · `React HR application` · `open source people management` · `free attendance system` · `performance review software` · `open source employee directory`
