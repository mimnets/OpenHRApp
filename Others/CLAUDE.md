# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server on port 3000
npm run build    # Production build
npm run preview  # Serve production build locally
```

Backend: PocketBase server must be running. Deploy `Others/pb_hooks/main.pb.js` to PocketBase's `pb_hooks/` folder for email notifications.

## Architecture Overview

OpenHR is a React 19 + TypeScript HR management system using PocketBase as the backend. Key characteristics:
- **No React Router** - Uses local state routing in `App.tsx` via `currentPath` state
- **Context + Event Bus** for state management (no Redux)
- **Service layer facade** - All API calls go through `hrService` which aggregates domain services
- **Multi-tenant** - Every query includes `org_id` filtering via `apiClient.getOrganizationId()`
- **PWA-enabled** with service worker support

### Data Flow Pattern

```
Pages/Components → Hooks → hrService (facade) → Domain Services → apiClient → PocketBase SDK
```

### Key Directories

- `src/services/` - Domain services (auth, attendance, leave, employee, organization, superadmin)
- `src/hooks/` - Data fetching hooks organized by feature (dashboard/, attendance/)
- `src/pages/` - Full-page components (route targets)
- `src/components/` - Reusable UI organized by feature (dashboard/, attendance/, leave/, organization/, subscription/)
- `src/context/` - AuthContext, ThemeContext, SubscriptionContext
- `src/config/database.ts` - PocketBase URL resolution

### Role-Based Access Control

Roles: `SUPER_ADMIN`, `ADMIN`, `HR`, `MANAGER`, `TEAM_LEAD`, `EMPLOYEE`

- Sidebar menu items filtered by `role.roles` array
- Dashboard dispatches to role-specific components (AdminDashboard, ManagerDashboard, EmployeeDashboard)
- Services filter data by org_id for multi-org isolation

### Service Layer

| Service | Purpose |
|---------|---------|
| `hrService.ts` | Facade aggregating all domain services |
| `auth.service.ts` | Login, registration, password reset, email verification |
| `attendance.service.ts` | Punch in/out, active session tracking, auto-close logic |
| `leave.service.ts` | Leave requests, balance calculation, workflow routing |
| `employee.service.ts` | Employee CRUD with role-based filtering |
| `organization.service.ts` | Config/settings with in-memory caching |
| `api.client.ts` | PocketBase wrapper + event bus for cross-component sync |

### Key Patterns

**Attendance Auto-Close**: `attendanceService.getActiveAttendance()` automatically closes past-date or time-exceeded sessions.

**Leave Workflow Routing**: Initial status (PENDING_MANAGER vs PENDING_HR) determined by department workflow config and line manager availability.

**Type Mapping**: Services handle snake_case (DB) ↔ camelCase (TypeScript) conversion.

**Caching**: `organizationService` caches settings in memory; call `clearCache()` on logout.

### Configuration

- `vite.config.ts` - Port 3000, path alias `@/` → `./src/`
- `src/config/database.ts` - PocketBase URL from env or hardcoded fallback
- `src/constants.tsx` - Default config, departments, office locations, holidays

### Types

All entity interfaces in `src/types.ts`: User, Employee, Attendance, LeaveRequest, Team, Organization, AppConfig, LeavePolicy, LeaveWorkflow, SubscriptionInfo.

### Subscription System

Organizations have subscription statuses: `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`

- **TRIAL**: 14 days from registration, full access, countdown shown in UI
- **ACTIVE**: Full access, no restrictions (set by Super Admin after payment)
- **EXPIRED**: Read-only mode - can view data but not create/modify (auto-transitions from TRIAL)
- **SUSPENDED**: Complete lockout - cannot login (set by Super Admin)

Key files:
- `src/context/SubscriptionContext.tsx` - Subscription state and `canPerformAction()` check
- `src/components/subscription/` - SubscriptionGuard, SubscriptionBanner, SuspendedPage
- `Others/pb_hooks/cron.pb.js` - Auto-expiration cron job (runs daily at midnight)
- `Others/pb_hooks/main.pb.js` - `/api/openhr/subscription-status` endpoint
