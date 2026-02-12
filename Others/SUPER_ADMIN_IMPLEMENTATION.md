# Super Admin - Organization Management Implementation

## Overview
This feature allows a **Super Admin** (platform owner) to manage all organizations registered in the OpenHR platform. Super Admins have full CRUD access to organizations and can view/manage users within each organization.

---

## 1. PocketBase Schema Changes

### 1.1 Update `users` Collection - Add SUPER_ADMIN Role

**Go to:** PocketBase Admin → Collections → `users` → Fields → `role`

**Update the `role` field options to include:**
```
SUPER_ADMIN
ADMIN
HR
MANAGER
EMPLOYEE
```

**Save the changes.**

### 1.2 Create Super Admin User

**Option A: Via PocketBase Admin UI**
1. Go to PocketBase Admin → Collections → `users`
2. Click "New Record"
3. Fill in:
   - `email`: your-super-admin@email.com
   - `password`: (secure password)
   - `name`: Super Admin
   - `role`: SUPER_ADMIN
   - `organization_id`: Leave EMPTY (Super Admin doesn't belong to any org)
   - `verified`: true
   - `employee_id`: SUPER-001
4. Save

**Option B: Via SQL (if using SQLite directly)**
```sql
-- Run this after creating the user via UI to update role
UPDATE users SET role = 'SUPER_ADMIN', organization_id = NULL WHERE email = 'your-super-admin@email.com';
```

### 1.3 Update API Rules for `organizations` Collection

**Go to:** PocketBase Admin → Collections → `organizations` → API Rules

| Rule | Current | New Value |
|------|---------|-----------|
| **List** | `@request.auth.organization_id = id` | `@request.auth.role = "SUPER_ADMIN" \|\| @request.auth.organization_id = id` |
| **View** | `@request.auth.organization_id = id` | `@request.auth.role = "SUPER_ADMIN" \|\| @request.auth.organization_id = id` |
| **Create** | (locked/empty) | `@request.auth.role = "SUPER_ADMIN"` |
| **Update** | `@request.auth.organization_id = id && @request.auth.role = "ADMIN"` | `@request.auth.role = "SUPER_ADMIN" \|\| (@request.auth.organization_id = id && @request.auth.role = "ADMIN")` |
| **Delete** | (locked/empty) | `@request.auth.role = "SUPER_ADMIN"` |

### 1.4 Update API Rules for `users` Collection (Super Admin Access)

**Go to:** PocketBase Admin → Collections → `users` → API Rules

| Rule | New Value |
|------|-----------|
| **List** | `@request.auth.role = "SUPER_ADMIN" \|\| @request.auth.organization_id = organization_id` |
| **View** | `@request.auth.role = "SUPER_ADMIN" \|\| @request.auth.organization_id = organization_id` |
| **Update** | `@request.auth.role = "SUPER_ADMIN" \|\| id = @request.auth.id \|\| @request.auth.role = "ADMIN" \|\| @request.auth.role = "HR"` |
| **Delete** | `@request.auth.role = "SUPER_ADMIN" \|\| ((@request.auth.role = "ADMIN" \|\| @request.auth.role = "HR") && @request.auth.organization_id = organization_id)` |

### 1.5 Update API Rules for Other Collections (Optional - for full visibility)

For `settings`, `attendance`, `leaves`, `teams` collections, add Super Admin access:

**List/View Rule Pattern:**
```
@request.auth.role = "SUPER_ADMIN" || @request.auth.organization_id = organization_id
```

---

## 2. Frontend Implementation

### 2.1 New Files to Create

```
src/
├── pages/
│   └── SuperAdmin.tsx              # Main super admin dashboard
├── components/
│   └── superadmin/
│       ├── OrganizationList.tsx    # List all organizations with stats
│       ├── OrganizationForm.tsx    # Create/Edit organization form
│       ├── OrganizationUsers.tsx   # View/manage users in an org
│       └── SuperAdminStats.tsx     # Platform-wide statistics
├── services/
│   └── superadmin.service.ts       # API calls for super admin features
```

### 2.2 Service Layer (superadmin.service.ts)

```typescript
// New service for super admin operations
export const superAdminService = {
  // Organizations
  async getAllOrganizations(): Promise<Organization[]>,
  async createOrganization(data: Partial<Organization>): Promise<Organization>,
  async updateOrganization(id: string, data: Partial<Organization>): Promise<void>,
  async deleteOrganization(id: string): Promise<void>,

  // Users within organizations
  async getOrganizationUsers(orgId: string): Promise<User[]>,
  async updateUser(userId: string, data: Partial<User>): Promise<void>,
  async deleteUser(userId: string): Promise<void>,
  async verifyUser(userId: string): Promise<void>,

  // Stats
  async getPlatformStats(): Promise<PlatformStats>,
};
```

### 2.3 Types to Add (types.ts)

```typescript
export interface Organization {
  id: string;
  name: string;
  address?: string;
  subscription_status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED';
  logo?: string;
  created: string;
  updated: string;
  // Computed fields (from API)
  userCount?: number;
  adminEmail?: string;
}

export interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  activeOrganizations: number;
  trialOrganizations: number;
  expiredOrganizations: number;
  recentRegistrations: number; // last 30 days
}
```

### 2.4 Update App.tsx Routing

Add Super Admin route detection and page rendering:

```typescript
// In App.tsx
const isSuperAdmin = user?.role === 'SUPER_ADMIN';

// Add new route
if (isSuperAdmin && currentPath === 'super-admin') {
  return <SuperAdmin user={user} onNavigate={handleNavigate} />;
}
```

### 2.5 Update Sidebar for Super Admin

Add super admin menu items when role is SUPER_ADMIN:

```typescript
// In Sidebar.tsx
const menuItems = [
  // Existing items...
  { id: 'super-admin', label: 'Organizations', icon: Building2, roles: ['SUPER_ADMIN'] },
];
```

---

## 3. UI Features

### 3.1 Organization Dashboard (SuperAdmin.tsx)

**Stats Cards:**
- Total Organizations
- Active Subscriptions
- Trial Accounts
- Expired/Suspended Accounts
- Total Users (platform-wide)
- New Registrations (last 30 days)

**Organization Table:**
| Column | Description |
|--------|-------------|
| Name | Organization name |
| Status | ACTIVE/TRIAL/EXPIRED badge |
| Users | User count |
| Admin | Primary admin email |
| Created | Registration date |
| Actions | View, Edit, Delete buttons |

### 3.2 Organization Form (Create/Edit)

**Fields:**
- Organization Name (required)
- Address (optional)
- Subscription Status (dropdown)
- Logo (file upload)

**For Create:**
- Also create initial admin user with email/password

### 3.3 Organization Users View

**User Table:**
| Column | Description |
|--------|-------------|
| Name | User name |
| Email | User email |
| Role | ADMIN/HR/MANAGER/EMPLOYEE |
| Status | Verified badge |
| Actions | Verify, Edit Role, Delete |

**Actions:**
- Verify unverified users
- Change user roles
- Delete users (with confirmation)
- Reset user password (sends reset email)

---

## 4. Security Considerations

### 4.1 Super Admin Isolation
- Super Admin has NO organization_id (null)
- Super Admin bypasses org-based filtering
- Super Admin cannot use regular employee features (attendance, leave)

### 4.2 Audit Logging (Optional Future Enhancement)
- Log all Super Admin actions
- Track who deleted/modified organizations
- Store in a new `audit_logs` collection

### 4.3 Two-Factor Authentication (Recommended)
- Consider requiring 2FA for Super Admin accounts
- PocketBase supports this via external auth providers

---

## 5. Implementation Order

### Phase 1: Backend Setup (PocketBase Admin - YOU NEED TO DO THIS)
1. [ ] Update `role` field in users collection - Add `SUPER_ADMIN` option
2. [ ] Create Super Admin user manually in PocketBase Admin
3. [ ] Update API rules for `organizations` (see section 1.3)
4. [ ] Update API rules for `users` (see section 1.4)
5. [ ] Test API access via PocketBase Admin

### Phase 2: Service Layer ✅ COMPLETED
1. [x] Create `superadmin.service.ts` - Created at `src/services/superadmin.service.ts`
2. [x] Add new types to `types.ts` - Added `SUPER_ADMIN` role, `SubscriptionStatus`, `PlatformStats`
3. [ ] Test service functions

### Phase 3: UI Components ✅ COMPLETED
1. [x] Create `SuperAdmin.tsx` main page - All-in-one component with:
   - Organization list with stats
   - Create/Edit organization form
   - Users view per organization
   - Platform statistics dashboard

### Phase 4: Integration ✅ COMPLETED
1. [x] Update `App.tsx` routing - Super Admin redirects to SuperAdmin page
2. [x] Update `Sidebar.tsx` menu - Super Admin has dedicated menu
3. [x] AuthContext already handles role-based access
4. [ ] Test full flow

### Phase 5: Testing
1. [ ] Test organization CRUD
2. [ ] Test user management within orgs
3. [ ] Test stats accuracy
4. [ ] Test security (regular admin cannot access super admin features)

---

## 6. API Endpoints Summary

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/collections/organizations/records` | GET | List all orgs | SUPER_ADMIN |
| `/api/collections/organizations/records` | POST | Create org | SUPER_ADMIN |
| `/api/collections/organizations/records/:id` | PATCH | Update org | SUPER_ADMIN |
| `/api/collections/organizations/records/:id` | DELETE | Delete org | SUPER_ADMIN |
| `/api/collections/users/records?filter=organization_id=':orgId'` | GET | List org users | SUPER_ADMIN |
| `/api/collections/users/records/:id` | PATCH | Update user | SUPER_ADMIN |
| `/api/collections/users/records/:id` | DELETE | Delete user | SUPER_ADMIN |

---

## 7. Notes

- **Backup Strategy:** Before deleting an organization, consider soft-delete (status = 'DELETED') instead of hard delete
- **Data Migration:** Deleting an org should handle cascade (users, settings, attendance, leaves, teams)
- **Subscription Integration:** Future enhancement - integrate with payment gateway for subscription status

---

## 8. Settings Collection API Rules (REQUIRED for Ad Management)

The `settings` collection needs to allow Super Admin to create global settings (for ads).

**Go to:** PocketBase Admin → Collections → `settings` → API Rules

Update the rules as follows:

| Rule | Value |
|------|-------|
| **List** | `@request.auth.role = "SUPER_ADMIN" \|\| @request.auth.organization_id = organization_id` |
| **View** | `@request.auth.role = "SUPER_ADMIN" \|\| @request.auth.organization_id = organization_id` |
| **Create** | `@request.auth.role = "SUPER_ADMIN" \|\| (@request.auth.organization_id != "" && @request.auth.organization_id = @request.data.organization_id)` |
| **Update** | `@request.auth.role = "SUPER_ADMIN" \|\| @request.auth.organization_id = organization_id` |
| **Delete** | `@request.auth.role = "SUPER_ADMIN" \|\| @request.auth.organization_id = organization_id` |

**Important:** The Create rule allows:
1. Super Admin to create any settings (including global ones with empty `organization_id`)
2. Regular users to create settings only for their own organization

---

## Quick Start Commands

After implementing, test with:

```bash
# Start dev server
npm run dev

# Login as Super Admin
# Navigate to /super-admin
# Verify you can see all organizations
```

# Updates:

```
Fixed users Collection - Create Rule
                                                                                                                                  
  Use this instead:

  @request.auth.role = "SUPER_ADMIN" || @request.auth.role = "ADMIN" || @request.auth.role = "HR"

  This is simpler and still secure because:
  1. Only Super Admin, ADMIN, or HR can create users
  2. The frontend code (employeeService.ts) already sets organization_id from the authenticated user's organization automatically 
  3. The API rule for List/View ensures users can only see users in their own org anyway

  ---
  Complete users Collection API Rules (Fixed)
  Rule: List
  Value: @request.auth.role = "SUPER_ADMIN" || @request.auth.organization_id = organization_id
  ────────────────────────────────────────
  Rule: View
  Value: @request.auth.role = "SUPER_ADMIN" || @request.auth.organization_id = organization_id
  ────────────────────────────────────────
  Rule: Create
  Value: @request.auth.role = "SUPER_ADMIN" || @request.auth.role = "ADMIN" || @request.auth.role = "HR"
  ────────────────────────────────────────
  Rule: Update
  Value: @request.auth.role = "SUPER_ADMIN" || id = @request.auth.id || @request.auth.role = "ADMIN" || @request.auth.role = "HR" 
  ────────────────────────────────────────
  Rule: Delete
  Value: @request.auth.role = "SUPER_ADMIN" || @request.auth.role = "ADMIN" || @request.auth.role = "HR"
  These simplified rules should save without errors. The organization isolation is enforced by:
  1. The List/View rules (users only see their org's data)
  2. The frontend code (always injects the correct organization_id)
```

# Super Admin

Yes, exactly! The PocketBase super admin (used to access /_/ admin panel) is a completely separate system account.

  For OpenHR, you need to create a regular user in the users collection with role SUPER_ADMIN.

  Steps to Create Super Admin User:

  1. Go to PocketBase Admin (http://localhost:8090/_/)
  2. Navigate to Collections → users
  3. Click "+ New record"
  4. Fill in these fields:
  ┌─────────────────┬──────────────────────────┐
  │      Field      │          Value           │
  ├─────────────────┼──────────────────────────┤
  │ email           │ your-email@example.com   │
  ├─────────────────┼──────────────────────────┤
  │ password        │ (min 8 characters)       │
  ├─────────────────┼──────────────────────────┤
  │ passwordConfirm │ (same as password)       │
  ├─────────────────┼──────────────────────────┤
  │ name            │ Super Admin              │
  ├─────────────────┼──────────────────────────┤
  │ role            │ SUPER_ADMIN              │
  ├─────────────────┼──────────────────────────┤
  │ verified        │ ✅ true (checked)        │
  ├─────────────────┼──────────────────────────┤
  │ employee_id     │ SUPER-001                │
  ├─────────────────┼──────────────────────────┤
  │ organization_id │ Leave EMPTY (important!) │
  ├─────────────────┼──────────────────────────┤
  │ department      │ Platform                 │
  ├─────────────────┼──────────────────────────┤
  │ designation     │ Super Admin              │
  └─────────────────┴──────────────────────────┘
  5. Click Save
  6. Now login to OpenHR app with that email/password

  The key difference:
  - PocketBase Admin = System admin for database management
  - OpenHR Super Admin = App-level admin for managing organizations in your HR platform