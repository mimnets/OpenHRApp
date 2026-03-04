# OpenHR Notification System

## PocketBase Collection: `notifications`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user_id` | Text | Yes | Recipient user ID |
| `type` | Select | Yes | `ANNOUNCEMENT`, `LEAVE`, `ATTENDANCE`, `REVIEW`, `SYSTEM` |
| `title` | Text (max 200) | Yes | Short notification title |
| `message` | Text | No | Longer description |
| `is_read` | Boolean | Yes | Default: false |
| `priority` | Select | Yes | `NORMAL`, `URGENT` |
| `reference_id` | Text | No | ID of related record |
| `reference_type` | Text | No | Collection name of related record |
| `action_url` | Text | No | In-app navigation target |
| `metadata` | JSON | No | Extra type-specific data |
| `organization_id` | Relation -> organizations | Yes | Org scoping |

### API Rules

- **List/View:** `@request.auth.id != "" && user_id = @request.auth.id`
- **Create:** `@request.auth.id != "" && @request.body.organization_id = @request.auth.organization_id`
- **Update:** `@request.auth.id != "" && user_id = @request.auth.id`
- **Delete:** `@request.auth.id != "" && user_id = @request.auth.id`

---

## Implementation Phases

### Phase 1: Announcement Notifications (Implemented)

When a new announcement is created:
1. The announcement record is saved to the `announcements` collection
2. All target users (filtered by `targetRoles`, excluding the author) receive a notification
3. Notifications appear in the bell icon dropdown in the header
4. Clicking a notification marks it as read and navigates to the announcements page

**Files:**
- `src/services/notification.service.ts` — CRUD + bulk create + user preferences
- `src/services/announcement.service.ts` — Auto-generates notifications on create (respects org config)
- `src/hooks/notifications/useNotifications.ts` — React data hook with muted type filtering
- `src/components/notifications/NotificationBell.tsx` — Bell icon + dropdown UI + preferences panel

### Phase 2: Leave Notifications (Planned)

Trigger notifications for:
- Employee submits leave request -> Manager gets `LEAVE` notification
- Manager approves/rejects -> Employee gets `LEAVE` notification
- Leave forwarded to HR -> HR users get `LEAVE` notification

### Phase 3: Attendance Reminders (Planned)

Trigger notifications for:
- Daily check-in reminder (configurable time)
- Missed check-out alert
- Late arrival notification to manager

### Phase 4: Review Notifications (Planned)

Trigger notifications for:
- Review cycle opens -> All employees get `REVIEW` notification
- Self-assessment submitted -> Manager gets `REVIEW` notification
- Manager review completed -> HR gets `REVIEW` notification
- Review finalized -> Employee gets `REVIEW` notification

---

## Admin Configuration (Implemented)

Organization-level notification settings managed via the **NOTIFICATIONS** tab on the Organization page.

### Settings (stored as `notification_config` in PocketBase `settings` collection)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabledTypes` | `NotificationType[]` | All types | Which notification types are active |
| `emailDigestFrequency` | `EmailDigestFrequency` | `IMMEDIATE` | Default email digest: IMMEDIATE, DAILY, WEEKLY, OFF |
| `quietHoursEnabled` | `boolean` | `false` | Whether quiet hours are active |
| `quietHoursStart` | `string` (HH:mm) | `22:00` | Quiet hours start time |
| `quietHoursEnd` | `string` (HH:mm) | `07:00` | Quiet hours end time |

**Behavior:**
- When a notification type is disabled, services skip creating notifications of that type
- Currently enforced in `announcement.service.ts` (checks `enabledTypes` before creating bulk notifications)

**Files:**
- `src/types.ts` — `OrgNotificationConfig`, `EmailDigestFrequency`
- `src/constants.tsx` — `DEFAULT_NOTIFICATION_CONFIG`
- `src/services/organization.service.ts` — `getNotificationConfig()`, `setNotificationConfig()` with caching
- `src/components/organization/OrgNotifications.tsx` — Admin config UI
- `src/pages/Organization.tsx` — NOTIFICATIONS tab
- `src/hooks/organization/useOrganization.ts` — `notificationConfig` state + `saveNotificationConfig` action

---

## User Notification Preferences (Implemented)

Per-user preferences accessible via the gear icon in the bell dropdown.

### Settings (stored as `notification_prefs_<userId>` in PocketBase `settings` collection)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mutedTypes` | `NotificationType[]` | `[]` | Notification types the user has muted |
| `emailDigestFrequency` | `EmailDigestFrequency` | `IMMEDIATE` | User's email digest preference |

**Behavior:**
- Muted types are filtered out client-side in `useNotifications` hook
- Notifications of muted types are still created (so un-muting reveals past notifications)
- Email digest frequency overrides the org default for that user

**Files:**
- `src/types.ts` — `UserNotificationPreferences`
- `src/constants.tsx` — `DEFAULT_USER_NOTIFICATION_PREFS`
- `src/services/notification.service.ts` — `getUserPreferences()`, `setUserPreferences()`
- `src/hooks/notifications/useNotifications.ts` — Loads prefs, exposes `userPreferences` + `updatePreferences`, filters by `mutedTypes`
- `src/components/notifications/NotificationBell.tsx` — Gear icon toggles preferences panel
