
# Multi-Tenancy Implementation Guide

This guide details the transformation of OpenHR from a single-organization tool to a SaaS-style multi-tenant platform.

## Core Concept
We will transition from a **Global Scope** to an **Organization Scope**. 
Every data fetch, update, and creation must be scoped to the currently logged-in user's `organization_id`.

---

## Step 1: Frontend Registration Flow (New)

We need a new page `pages/RegisterOrganization.tsx` that is publicly accessible.

**The Workflow:**
1.  User enters: `Organization Name`, `Admin Name`, `Admin Email`, `Password`.
2.  **Action 1**: Create a record in the new `organizations` collection.
3.  **Action 2**: Create a record in `users` collection with:
    *   `role`: 'ADMIN'
    *   `organization_id`: (The ID from Action 1)
    *   `email`: (Input email)
4.  **Action 3**: Initialize default settings for this specific Org ID (Workflows, Leave Policy, Shifts).

**Verification Strategy:**
PocketBase handles email verification natively.
1.  After creating the user, call `pb.collection('users').requestVerification(email)`.
2.  In `pages/Login.tsx`, prevent login if `user.verified` is false.

---

## Step 2: Refactoring `hrService.ts` & Services

Currently, our services fetch data globally. We need to ensure they respect the organization.

### A. The "Settings" Problem
Currently, `organization.service.ts` fetches settings like this:
```javascript
// OLD (Single Tenant)
pb.collection('settings').getFirstListItem('key = "app_config"')
```
This will fail in multi-tenancy because multiple orgs will have a key named "app_config".

**The Fix:**
We must filter by the user's organization.
```javascript
// NEW (Multi Tenant)
const myOrgId = pb.authStore.model.organization_id;
pb.collection('settings').getFirstListItem(`key = "app_config" && organization_id = "${myOrgId}"`)
```

### B. Creating Data
When creating new records (Employees, Teams), we must inject the `organization_id`.

**Example: Adding an Employee**
```typescript
// services/employee.service.ts
async addEmployee(data) {
  const currentUser = pb.authStore.model;
  
  const payload = {
    ...data,
    organization_id: currentUser.organization_id // CRITICAL: Stamp the record
  };
  
  await pb.collection('users').create(payload);
}
```

---

## Step 3: Frontend Context Updates

**`types.ts` Update:**
Add `organizationId` to the `User` and `Employee` interfaces.

**`AuthContext.tsx` Update:**
Ensure the `organization_id` is loaded into the user object immediately upon login.

---

## Step 4: The "Super Admin" vs "Org Admin"

We need to distinguish between:
1.  **Platform Admin (You)**: Can see all organizations.
2.  **Org Admin (HR)**: Can only see their own organization.

**Strategy:**
*   Create a specific Organization record for yourself (e.g., "OpenHR Super").
*   Or, creating a separate collection `platform_admins` if you want total separation.
*   *Recommendation:* Stick to standard Org Admins for now. If you need to debug another org, you can masquerade as them via the PocketBase dashboard.

---

## Step 5: Migration of Existing Data

If you have existing data you want to keep:
1.  Manually create an `organization` record in PocketBase (e.g., "Default Org").
2.  Run a script (or manual SQL in SQLite) to update **ALL** existing records in `users`, `attendance`, `leaves`, `teams`, `settings` to have `organization_id = "YOUR_NEW_ORG_ID"`.
3.  Once migrated, enable the new API Rules (see schema file).

