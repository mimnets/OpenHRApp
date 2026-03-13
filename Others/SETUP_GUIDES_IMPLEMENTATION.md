# Setup Guides & Contextual Help — Implementation Plan

## Overview

This feature adds two complementary systems to help new admins set up their organization and help all users understand how to use each feature:

1. **Setup Checklist** — A numbered, sequential guide on the Admin Dashboard that walks new admins through organization setup (steps 1-8 with progress tracking).
2. **Contextual Help Buttons** — Small info/help icons placed throughout the app that link to relevant tutorial pages. Super Admin can configure which tutorial each button links to.

---

## Part 1: Admin Setup Checklist (Dashboard Widget)

### What It Looks Like

A collapsible card on the Admin Dashboard showing numbered steps in a vertical timeline:

```
┌─────────────────────────────────────────────────────┐
│  🏗️ Set Up Your Organization                    ▼  │
│  Complete these steps to get your team started       │
│                                                      │
│  ● 1  Set Company Info          ✓ Done        ℹ️    │
│  │                                                   │
│  ● 2  Add Departments           ✓ Done        ℹ️    │
│  │                                                   │
│  ◉ 3  Configure Shifts          → Go          ℹ️    │
│  │                                                   │
│  ○ 4  Add Office Locations                    ℹ️    │
│  │                                                   │
│  ○ 5  Create Teams                            ℹ️    │
│  │                                                   │
│  ○ 6  Set Leave Policy                        ℹ️    │
│  │                                                   │
│  ○ 7  Add Holidays                            ℹ️    │
│  │                                                   │
│  ○ 8  Add Employees                           ℹ️    │
│                                                      │
│  Progress: ████████░░░░░░░ 2/8 complete              │
│                                                      │
│  [ ] Don't show this again                           │
└─────────────────────────────────────────────────────┘
```

**Legend:**
- `●` = Completed step (green filled circle with checkmark)
- `◉` = Current step (blue pulsing circle, highlighted)
- `○` = Future step (gray outline circle)
- `ℹ️` = Info button linking to the relevant tutorial
- `→ Go` = Action button that navigates to the relevant page/tab

### Setup Steps (Sequential Order)

| Step | Title | Check Condition | Navigate To | Tutorial Slug |
|------|-------|-----------------|-------------|---------------|
| 1 | Set Company Info | `org.name !== 'My Organization'` AND has address | `organization` (System tab) | `setting-up-organization` |
| 2 | Add Departments | `departments.length > 0` | `organization` (Structure tab) | `setting-up-organization` |
| 3 | Configure Shifts | At least 1 shift exists (non-default) | `organization` (Shifts tab) | `setting-up-organization` |
| 4 | Add Office Locations | `config.officeLocations.length > 0` | `organization` (Placement tab) | `setting-up-organization` |
| 5 | Create Teams | `teams.length > 0` | `organization` (Teams tab) | `setting-up-organization` |
| 6 | Set Leave Policy | Leave policy has been explicitly saved | `organization` (Leaves tab) | `understanding-leave-policies` |
| 7 | Add Holidays | Holidays have been modified from default | `organization` (Holidays tab) | `setting-up-organization` |
| 8 | Add Employees | `employees.length > 1` (more than just the admin) | `employees` | `managing-employees` |

### Data Storage

```typescript
// New setting key in organization settings collection
key: 'onboarding_status'
value: {
  dismissed: false,           // User clicked "Don't show this again"
  completedSteps: [1, 2],    // Which steps are done (auto-detected + manual)
  lastCheckedAt: '2026-03-13' // Last time we recalculated
}
```

### Auto-Detection Logic

Rather than relying only on manual tracking, each step's completion is **auto-detected** by checking actual data:

```typescript
interface SetupStep {
  id: number;
  title: string;
  description: string;
  navigateTo: string;           // currentPath value
  navigateTab?: string;         // OrgTab value (for Organization page)
  tutorialSlug: string;         // Links to /how-to-use/{slug}
  checkComplete: (data: SetupCheckData) => boolean;
}

interface SetupCheckData {
  org: Organization;
  departments: string[];
  teams: Team[];
  shifts: Shift[];
  config: AppConfig;
  leavePolicy: LeavePolicy;
  holidays: Holiday[];
  employeeCount: number;
}
```

### Behavior Rules

1. **Visibility:** Only shown to `ADMIN` and `HR` roles on the Dashboard.
2. **Auto-detect on load:** Each time the dashboard loads, recalculate which steps are done.
3. **Current step highlight:** The first incomplete step is highlighted as "current."
4. **"Go" button:** Navigates directly to the relevant page and tab.
5. **"ℹ️" button:** Opens the tutorial in a new tab (`/how-to-use/{slug}`).
6. **Dismiss:** "Don't show this again" checkbox hides the widget permanently (saved to settings).
7. **Re-enable:** Can be shown again from Settings page if admin wants to revisit.
8. **Completion celebration:** When all 8 steps are done, show a congratulations message with confetti animation, then auto-hide after a few seconds.

---

## Part 2: Contextual Help Buttons (App-Wide)

### What It Looks Like

Small info buttons placed next to section headers throughout the app:

```
┌─────────────────────────────────────────┐
│  Attendance                         ℹ️  │
│  ─────────────────────────────────────  │
│  (page content)                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Leave Balance                      ℹ️  │
│  ─────────────────────────────────────  │
│  Annual: 12  |  Casual: 8  |  Sick: 10 │
└─────────────────────────────────────────┘
```

The `ℹ️` is a small circular button (16-20px) with:
- A subtle `?` or `i` icon
- On hover: tooltip "View Guide"
- On click: opens `/how-to-use/{configured-slug}` in a new tab

### Help Point Locations

| Help Point ID | Page / Section | Default Tutorial Slug |
|---------------|----------------|----------------------|
| `dashboard.admin` | Admin Dashboard header | `welcome-to-openhr` |
| `dashboard.manager` | Manager Dashboard header | `welcome-to-openhr` |
| `dashboard.employee` | Employee Dashboard header | `welcome-to-openhr` |
| `attendance.clockin` | Attendance punch page | `how-to-clock-in-and-out` |
| `attendance.logs` | My Attendance History page | `understanding-attendance-logs` |
| `attendance.audit` | Attendance Audit page | `attendance-admin-audit` |
| `leave.balance` | Leave balance cards section | `how-to-apply-for-leave` |
| `leave.apply` | Leave application form | `how-to-apply-for-leave` |
| `leave.manager` | Manager approval hub | `leave-approval-for-managers` |
| `leave.hr` | HR administration section | `leave-approval-for-hr` |
| `employees.directory` | Employee Directory page | `managing-employees` |
| `employees.create` | Add Employee form | `managing-employees` |
| `org.structure` | Organization > Structure tab | `setting-up-organization` |
| `org.teams` | Organization > Teams tab | `setting-up-organization` |
| `org.placement` | Organization > Placement tab | `setting-up-organization` |
| `org.shifts` | Organization > Shifts tab | `setting-up-organization` |
| `org.workflow` | Organization > Workflow tab | `setting-up-organization` |
| `org.leaves` | Organization > Leaves tab | `understanding-leave-policies` |
| `org.holidays` | Organization > Holidays tab | `setting-up-organization` |
| `org.notifications` | Organization > Notifications tab | `notification-settings` |
| `org.system` | Organization > System tab | `setting-up-organization` |
| `reports.generator` | Reports generator page | `generating-reports` |
| `review.employee` | Performance Review (self) | `performance-review-self-assessment` |
| `review.manager` | Performance Review (manager) | `performance-review-for-managers` |
| `review.hr` | Performance Review (HR) | `performance-review-hr-calibration` |
| `announcements` | Announcements page | `announcements-guide` |
| `notifications.admin` | Admin Notifications page | `notifications-guide` |
| `settings.profile` | Settings/Profile page | `managing-profile-settings` |
| `settings.theme` | Theme selector section | `theme-customization` |

### Data Storage (Super Admin Configurable)

```typescript
// Settings collection (platform-level, no org_id = global)
key: 'guide_help_links'
value: {
  "dashboard.admin": "welcome-to-openhr",
  "attendance.clockin": "how-to-clock-in-and-out",
  "leave.balance": "how-to-apply-for-leave",
  // ... all help point mappings
}
```

---

## Part 3: Super Admin Configuration Panel

### What It Looks Like

A new section in the Super Admin > Tutorials tab (or a dedicated "Guide Links" tab):

```
┌─────────────────────────────────────────────────────┐
│  Guide Help Links Configuration                      │
│                                                      │
│  Configure which tutorial appears when users click   │
│  the ℹ️ help button on each page.                   │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ Dashboard (Admin)                                ││
│  │ Tutorial: [welcome-to-openhr          ▼]        ││
│  ├─────────────────────────────────────────────────┤│
│  │ Attendance - Clock In                            ││
│  │ Tutorial: [how-to-clock-in-and-out    ▼]        ││
│  ├─────────────────────────────────────────────────┤│
│  │ Leave - Balance                                  ││
│  │ Tutorial: [how-to-apply-for-leave     ▼]        ││
│  ├─────────────────────────────────────────────────┤│
│  │ ...                                              ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  [Save Changes]               [Reset to Defaults]    │
└─────────────────────────────────────────────────────┘
```

Each row shows:
- **Help Point Label** — Human-readable name of the location
- **Tutorial Dropdown** — Select from all published tutorials (fetched from tutorials collection)
- **Preview Link** — Small "Preview" link to open the selected tutorial

---

## Implementation Plan — File by File

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/onboarding/SetupChecklist.tsx` | The numbered setup checklist widget for Admin Dashboard |
| `src/components/onboarding/SetupStep.tsx` | Individual step item component (number bubble, title, action button, info link) |
| `src/components/onboarding/HelpButton.tsx` | Reusable contextual ℹ️ help button component |
| `src/hooks/onboarding/useSetupChecklist.ts` | Hook to compute step completion, fetch/save onboarding status |
| `src/components/superadmin/GuideLinksManagement.tsx` | Super Admin panel to configure help link mappings |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/AdminDashboard.tsx` | Add `<SetupChecklist />` widget between header and quick access |
| `src/pages/Organization.tsx` | Add `<HelpButton />` to each tab header |
| `src/pages/Leave.tsx` | Add `<HelpButton />` to relevant sections |
| `src/pages/Attendance.tsx` | Add `<HelpButton />` to page header |
| `src/pages/AttendanceLogs.tsx` | Add `<HelpButton />` to page header |
| `src/pages/EmployeeDirectory.tsx` | Add `<HelpButton />` to page header |
| `src/pages/Reports.tsx` | Add `<HelpButton />` to page header |
| `src/pages/PerformanceReview.tsx` | Add `<HelpButton />` to relevant sections |
| `src/pages/Announcements.tsx` | Add `<HelpButton />` to page header |
| `src/pages/AdminNotifications.tsx` | Add `<HelpButton />` to page header |
| `src/pages/Settings.tsx` | Add `<HelpButton />` to relevant sections |
| `src/pages/SuperAdmin.tsx` | Add "Guide Links" management tab or section |
| `src/services/organization.service.ts` | Add methods for `getOnboardingStatus()`, `setOnboardingStatus()`, `getGuideHelpLinks()` |
| `src/services/superadmin.service.ts` | Add methods for `getGuideHelpLinks()`, `setGuideHelpLinks()` |
| `src/services/hrService.ts` | Re-export new methods from the facade |

### No New PocketBase Collections Needed

Everything uses the existing `settings` collection with new keys:
- `onboarding_status` (per org)
- `guide_help_links` (global, no org_id)

---

## Component Specifications

### 1. `HelpButton.tsx` — Reusable Component

```
Props:
  helpPointId: string     — e.g., "attendance.clockin"
  className?: string      — Optional custom styling

Behavior:
  1. On mount, reads guide_help_links from cache/context
  2. Looks up the tutorial slug for this helpPointId
  3. Renders a small circular button with info icon
  4. On hover: shows tooltip "View Guide"
  5. On click: window.open('/how-to-use/{slug}', '_blank')
  6. If no slug configured: don't render (hide gracefully)
```

**Visual Spec:**
- Size: 20px circle
- Icon: `HelpCircle` from lucide-react (already in project)
- Color: `text-slate-400 hover:text-blue-500` (light) / `text-slate-500 hover:text-blue-400` (dark)
- Transition: smooth color and scale on hover
- Tooltip: native `title` attribute or custom tooltip component

### 2. `SetupChecklist.tsx` — Dashboard Widget

```
Props:
  user: User
  onNavigate: (path: string, params?: any) => void

State (from useSetupChecklist hook):
  steps: SetupStep[]           — All 8 steps with completion status
  isLoading: boolean
  isDismissed: boolean
  completedCount: number
  totalCount: number

Behavior:
  1. Fetch org data (departments, teams, shifts, etc.)
  2. Evaluate each step's checkComplete function
  3. Render vertical timeline with numbered bubbles
  4. Highlight first incomplete step as "current"
  5. Show progress bar at bottom
  6. Collapsible (expand/collapse toggle)
  7. "Don't show this again" saves dismissed state
```

### 3. `SetupStep.tsx` — Individual Step

```
Props:
  step: SetupStep
  status: 'completed' | 'current' | 'upcoming'
  onGo: () => void             — Navigate to the page
  onHelp: () => void           — Open tutorial

Visual:
  - Number bubble (24px circle):
    - completed: green bg, white checkmark
    - current: blue bg, white number, pulse animation
    - upcoming: gray border, gray number
  - Connecting line between steps (solid green for completed, dashed gray for upcoming)
  - Title text (bold for current, normal for others)
  - "Done" badge (completed) or "→ Go" button (current) or dimmed (upcoming)
  - ℹ️ help icon on the right
```

### 4. `GuideLinksManagement.tsx` — Super Admin Panel

```
Props:
  tutorials: Tutorial[]        — All published tutorials (for dropdown)

State:
  linkMap: Record<string, string>  — helpPointId → tutorialSlug
  isDirty: boolean
  isSaving: boolean

Behavior:
  1. Fetch current guide_help_links from settings
  2. Render a list of all help points with dropdown selectors
  3. Dropdown shows all published tutorial titles
  4. Save button updates the settings collection
  5. Reset to Defaults button restores the default mapping
```

---

## Data Flow Architecture

```
                    Super Admin Panel
                          │
                    saves to settings
                          │
                          ▼
              ┌─── settings collection ───┐
              │  key: guide_help_links    │
              │  value: { id → slug }     │
              └───────────┬───────────────┘
                          │
                 fetched on app init
                          │
                          ▼
              ┌─── GuideLinksContext ──────┐
              │  (or cached in service)   │
              │  Provides slug lookups    │
              └───────────┬───────────────┘
                          │
                  consumed by components
                          │
              ┌───────────┼──────────────┐
              ▼           ▼              ▼
         HelpButton   SetupChecklist   Other pages
         (per-page)   (dashboard)      (as needed)
```

### Caching Strategy

- `guide_help_links` is fetched once on login and cached (same pattern as `prefetchMetadata()`)
- Cache is cleared on logout
- Super Admin updates invalidate the cache for all users on next page load
- No real-time sync needed (settings change rarely)

---

## Suggested Implementation Order

### Phase 1: Foundation (Day 1)
1. Add `getGuideHelpLinks()` and `setGuideHelpLinks()` to services
2. Create the `HelpButton.tsx` component
3. Add `HelpButton` to 2-3 key pages (Dashboard, Organization, Leave) to validate the pattern

### Phase 2: Setup Checklist (Day 2)
4. Create `useSetupChecklist.ts` hook with auto-detection logic
5. Create `SetupStep.tsx` component
6. Create `SetupChecklist.tsx` widget
7. Integrate into `AdminDashboard.tsx`

### Phase 3: App-Wide Help Buttons (Day 3)
8. Add `HelpButton` to all remaining pages (Attendance, Reports, Reviews, etc.)
9. Add `HelpButton` to all Organization sub-tabs

### Phase 4: Super Admin Configuration (Day 4)
10. Create `GuideLinksManagement.tsx` component
11. Add it to Super Admin panel (new tab or section under Tutorials)
12. Wire up save/load/reset functionality

### Phase 5: Polish (Day 5)
13. Add animations (pulse on current step, confetti on completion)
14. Add "Re-enable setup guide" option in Settings
15. Test all tutorial slug links are valid
16. Mobile-responsive adjustments

---

## Decisions Made

1. **Help button style:** Three variants — `default` (visible with border/shadow for page headers), `sidebar` (appears on hover for sidebar items), `inline` (subtle for tab buttons).
2. **Tutorial opens in:** New browser tab (`window.open('/how-to-use/{slug}', '_blank')`).
3. **Setup checklist position:** Top of Admin Dashboard (above quick access cards).
4. **Completion tracking:** Purely auto-detected by querying real org data on each dashboard load.
5. **First-time detection:** Shown to ALL admins and HR roles, always — with dismiss/re-enable capability.

---

## Implementation Status (Completed)

### Phase 1: Foundation
- [x] Service methods for guide links (`getGuideHelpLinks`, `setGuideHelpLinks`, `getOnboardingStatus`, `setOnboardingStatus`)
- [x] `HelpButton.tsx` component with 3 variants (`default`, `sidebar`, `inline`)
- [x] Module-level caching for guide links (fetched once, cleared on logout)

### Phase 2: Setup Checklist
- [x] `useSetupChecklist.ts` hook with 8 auto-detection checks
- [x] `SetupChecklist.tsx` widget with numbered timeline, progress bar, collapse/expand
- [x] Integrated into `AdminDashboard.tsx`
- [x] Organization page supports `initialTab` prop for direct tab navigation from checklist

### Phase 3: App-Wide Help Buttons
- [x] Added to all 14+ page locations (Attendance, Leave, Employees, Reports, Reviews, Announcements, Notifications, Settings)
- [x] Added to ALL sidebar menu items (visible on hover via `sidebar` variant)
- [x] Added to ALL Organization tab buttons (visible when tab is active via `inline` variant)
- [x] Help buttons use visible colors: `text-primary/60` with border, shadow, and hover effects

### Phase 4: Super Admin Configuration
- [x] `GuideLinksManagement.tsx` with grouped sections (Sidebar, Dashboard, Attendance, Leave, Employees, Organization, Reports, Reviews, Other)
- [x] Added as "Guides" tab in Super Admin panel
- [x] Dropdown shows all published tutorials, with preview link

### Phase 5: Polish
- [x] Pulse animation on current setup step
- [x] Progress bar with smooth transition animation
- [x] "Don't show this again" dismiss with visible "Show Setup Guide" button on dashboard when dismissed
- [x] "Re-enable Setup Guide" button in Settings page
- [x] `ReEnableSetupGuide` exported component for Settings page integration

---

## HelpButton Variant System

```typescript
type HelpButtonVariant = 'default' | 'sidebar' | 'inline';

// default: Visible on page headers — primary color with border and shadow
// sidebar: Appears on hover for sidebar menu items — subtle until hovered
// inline: Subtle for tab buttons — shown only when tab is active

const variantStyles = {
  default: 'text-primary/60 hover:text-primary hover:bg-primary-light shadow-sm border border-primary/10 hover:border-primary/30',
  sidebar: 'text-slate-300 hover:text-primary hover:bg-primary-light/50 opacity-0 group-hover:opacity-100',
  inline: 'text-primary/50 hover:text-primary hover:bg-primary-light',
};
```

---

## Sidebar Help Icons (All Roles)

Every sidebar menu item has a `HelpButton` with `variant="sidebar"` that appears on hover:

| Menu Item | Help Point ID | Visible To |
|-----------|---------------|------------|
| Dashboard | `sidebar.dashboard` | ADMIN, HR, MANAGER, EMPLOYEE |
| My Profile | `sidebar.profile` | ALL |
| My Attendance | `sidebar.attendance-logs` | ALL |
| Attendance Audit | `sidebar.attendance-audit` | ADMIN, HR, MANAGER |
| Leave | `sidebar.leave` | ALL |
| Announcements | `sidebar.announcements` | ALL |
| Notifications | `sidebar.admin-notifications` | ADMIN, HR |
| Team Directory | `sidebar.employees` | ADMIN, HR, MANAGER |
| Performance | `sidebar.performance-review` | ALL |
| Organization | `sidebar.organization` | ADMIN, HR |
| Reports | `sidebar.reports` | ADMIN, HR |
| Settings | `sidebar.settings` | ADMIN, HR |

Super Admin sidebar items do NOT show help buttons (Super Admin has a different flow).

---

## Setup Checklist Dismiss/Re-enable Flow

```
Dashboard Load (Admin/HR)
    │
    ├── Not dismissed → Show full SetupChecklist widget
    │     └── User clicks "Don't show this again"
    │           └── Saves dismissed=true to settings
    │
    └── Dismissed → Show compact "Show Setup Guide" button
          ├── Dashed border, BookOpen icon, "Reopen the step-by-step..."
          └── User clicks → reEnable() → removes dismissed flag
                └── Full checklist reappears

Settings Page (Admin/HR)
    └── Shows "Re-enable Setup Guide" button (if dismissed)
          └── Same reEnable() function
```

---

## PocketBase Collections — No Changes Needed

This feature does **NOT** require any new PocketBase collections or schema modifications. Everything uses the existing `settings` collection:

### Settings Keys Used

| Key | Scope | Purpose |
|-----|-------|---------|
| `onboarding_status` | Per org (`organization_id` set) | Stores `{ dismissed: boolean }` for setup checklist state |
| `guide_help_links` | Platform-level (no `organization_id`) | Stores `{ helpPointId: tutorialSlug }` mapping configured by Super Admin |

### How It Works

1. **Setup Checklist state**: Uses `organizationService.getOnboardingStatus()` / `setOnboardingStatus()` which read/write a `settings` record with `key='onboarding_status'` and the current org's `organization_id`.

2. **Guide Help Links**: Uses `superAdminService.getGuideHelpLinks()` / `setGuideHelpLinks()` which read/write a `settings` record with `key='guide_help_links'` and NO `organization_id` (platform-wide).

3. **Step completion auto-detection**: Does NOT store completion data. Instead, queries real org data (departments, teams, shifts, etc.) on each dashboard load to determine which steps are done.

### Existing Collections Referenced (Read-Only)

| Collection | Used By | Purpose |
|------------|---------|---------|
| `settings` | Setup Checklist, HelpButton | Store/read onboarding status and guide link mappings |
| `teams` | Step 5 check | Count teams to determine if "Create Teams" step is complete |
| `shifts` | Step 3 check | Count shifts to determine if "Configure Shifts" step is complete |
| `users` | Step 8 check | Count employees to determine if "Add Employees" step is complete |
| `tutorials` | GuideLinksManagement | Fetch all published tutorials for dropdown selection |

---

## Suggestions & Future Improvements

1. **Role-specific tutorial slugs**: Currently all roles see the same tutorial for a given help point. Could extend the mapping to support role-specific tutorials (e.g., `leave.balance` shows a different guide for employees vs managers).

2. **Tutorial completion tracking**: Track which tutorials a user has viewed, show a checkmark or "Read" badge on help buttons for tutorials they've already opened.

3. **In-app tutorial preview**: Instead of always opening in a new tab, could add an in-app slide-over panel that shows tutorial content without leaving the current page.

4. **Setup checklist for Managers**: Currently only shows for Admin/HR. Could add a lighter "Manager Onboarding" checklist (e.g., "Review your team members", "Set up shift assignments", "Learn about leave approvals").

5. **Animated tooltips on first visit**: For first-time users, show animated pulse/tooltip on help buttons to draw attention to them. After the user clicks one, stop the animation.

6. **Search within guides**: Add a search bar to the tutorials page that lets users search across all tutorial content, not just browse by category.

7. **Video tutorials**: Extend the tutorial system to support embedded video content alongside text guides.

8. **Contextual tips**: Small inline tips that appear below form fields (e.g., "Tip: You can set different leave quotas per employee in Organization > Leaves") that link to the relevant guide.
