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
- `src/services/notification.service.ts` — CRUD + bulk create
- `src/services/announcement.service.ts` — Auto-generates notifications on create
- `src/hooks/notifications/useNotifications.ts` — React data hook
- `src/components/notifications/NotificationBell.tsx` — Bell icon + dropdown UI

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

## Admin Configuration (Future)

Planned settings per organization:
- Enable/disable notification types
- Email digest frequency (immediate, daily, weekly)
- Quiet hours configuration
- Per-user notification preferences
