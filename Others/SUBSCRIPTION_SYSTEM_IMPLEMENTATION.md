# Subscription System Implementation Guide

This document provides a complete solution for implementing subscription status management in OpenHR to prevent abuse and manage organization access.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Subscription Status Definitions](#2-subscription-status-definitions)
3. [Feature Limitations by Status](#3-feature-limitations-by-status)
4. [Implementation Plan](#4-implementation-plan)
5. [Files to Modify](#5-files-to-modify)
6. [Database Schema Changes](#6-database-schema-changes)
7. [Backend Implementation](#7-backend-implementation)
8. [Frontend Implementation](#8-frontend-implementation)
9. [Cron Job for Auto-Expiration](#9-cron-job-for-auto-expiration)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Current State Analysis

### What Exists Today

| Feature | Status |
|---------|--------|
| `SubscriptionStatus` type defined | ✅ Yes (`src/types.ts`) |
| `subscription_status` field on organizations | ✅ Yes |
| New orgs default to `TRIAL` | ✅ Yes (`pb_hooks/main.pb.js`) |
| Super Admin can manually change status | ✅ Yes |
| Status badges in Super Admin UI | ✅ Yes |

### What's Missing

| Feature | Status |
|---------|--------|
| `trial_end_date` field | ❌ Not implemented |
| 14-day calculation from registration | ❌ Not implemented |
| Automatic TRIAL → EXPIRED transition | ❌ Not implemented |
| Feature restrictions by status | ❌ Not implemented |
| User-facing trial countdown | ❌ Not implemented |
| Expired/Suspended blocking | ❌ Not implemented |

---

## 2. Subscription Status Definitions

### TRIAL (14 days from registration)

**Duration**: 14 days from organization creation date

**Description**: New organizations start in Trial mode. Full access to all features to evaluate the system.

**Behavior**:
- All features unlocked
- Trial countdown displayed in dashboard
- Warning banner shown in last 3 days
- Automatically transitions to EXPIRED after 14 days if not upgraded

### ACTIVE (Paid/Approved)

**Duration**: Indefinite (until manually changed or payment lapses)

**Description**: Organization has an active subscription or has been approved by Super Admin.

**Behavior**:
- All features unlocked
- No warnings or limitations
- Can be set manually by Super Admin after payment verification

### EXPIRED (Trial ended or subscription lapsed)

**Duration**: Until upgraded to ACTIVE or SUSPENDED

**Description**: Trial period ended without upgrading, or paid subscription lapsed.

**Behavior**:
- **Read-only mode** - Can view existing data but cannot create new records
- Cannot punch attendance
- Cannot create leave requests
- Cannot add new employees
- Cannot modify organization settings
- Admin can still access dashboard and view reports
- Prominent banner urging upgrade/contact

### SUSPENDED (Administrative action)

**Duration**: Until manually reactivated by Super Admin

**Description**: Organization suspended due to policy violation, payment issues, or administrative reasons.

**Behavior**:
- **Complete lockout** - Cannot log in at all
- Shows suspension message at login
- Only Super Admin can reactivate
- All data preserved but inaccessible

---

## 3. Feature Limitations by Status

| Feature | TRIAL | ACTIVE | EXPIRED | SUSPENDED |
|---------|-------|--------|---------|-----------|
| Login | ✅ | ✅ | ✅ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ❌ |
| View Attendance Records | ✅ | ✅ | ✅ | ❌ |
| Punch In/Out | ✅ | ✅ | ❌ | ❌ |
| View Leave Requests | ✅ | ✅ | ✅ | ❌ |
| Create Leave Requests | ✅ | ✅ | ❌ | ❌ |
| Approve/Reject Leaves | ✅ | ✅ | ❌ | ❌ |
| View Employees | ✅ | ✅ | ✅ | ❌ |
| Add/Edit Employees | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ❌ |
| Export Reports | ✅ | ✅ | ❌ | ❌ |
| Organization Settings | ✅ | ✅ | ❌ | ❌ |
| Trial Banner | ✅ | ❌ | ❌ | ❌ |
| Expired Banner | ❌ | ❌ | ✅ | ❌ |
| Suspension Message | ❌ | ❌ | ❌ | ✅ |

---

## 4. Implementation Plan

### Phase 1: Database & Backend (Priority: High)

1. Add `trial_end_date` field to `organizations` collection in PocketBase
2. Update registration hook to set `trial_end_date = created + 14 days`
3. Create cron job to auto-expire trials
4. Add subscription check endpoint

### Phase 2: Frontend - Auth & Context (Priority: High)

1. Extend AuthContext to include subscription status
2. Create SubscriptionContext for status checking
3. Add subscription check on login
4. Implement SUSPENDED blocking at login

### Phase 3: Frontend - Feature Restrictions (Priority: Medium)

1. Create SubscriptionGuard component
2. Add guards to write operations
3. Implement read-only mode for EXPIRED
4. Add warning banners

### Phase 4: UI Enhancements (Priority: Low)

1. Trial countdown in dashboard
2. Upgrade prompts
3. Suspension message page
4. Admin notification for expiring trials

---

## 5. Files to Modify

### Backend (PocketBase Hooks)

| File | Changes |
|------|---------|
| `Others/pb_hooks/main.pb.js` | Add `trial_end_date` calculation on registration |
| `Others/pb_hooks/cron.pb.js` | Add auto-expiration cron job |

### Frontend - Types & Services

| File | Changes |
|------|---------|
| `src/types.ts` | Add `trialEndDate` to Organization interface |
| `src/services/auth.service.ts` | Add subscription status check on login |
| `src/services/api.client.ts` | Add `getSubscriptionStatus()` method |
| `src/services/superadmin.service.ts` | Handle `trial_end_date` field mapping |

### Frontend - Context

| File | Changes |
|------|---------|
| `src/context/AuthContext.tsx` | Add subscription status to context, check on login |
| **NEW** `src/context/SubscriptionContext.tsx` | Create subscription management context |

### Frontend - Components

| File | Changes |
|------|---------|
| **NEW** `src/components/SubscriptionGuard.tsx` | Guard component for write operations |
| **NEW** `src/components/SubscriptionBanner.tsx` | Trial/Expired warning banners |
| **NEW** `src/components/SuspendedPage.tsx` | Suspension message page |
| `src/components/Sidebar.tsx` | Add subscription banner slot |
| `src/components/dashboard/*.tsx` | Add trial countdown display |

### Frontend - Pages

| File | Changes |
|------|---------|
| `src/pages/Login.tsx` | Handle SUSPENDED status blocking |
| `src/pages/Attendance.tsx` | Wrap punch actions in SubscriptionGuard |
| `src/pages/Leave.tsx` | Wrap create/approve actions in SubscriptionGuard |
| `src/pages/EmployeeDirectory.tsx` | Wrap add/edit actions in SubscriptionGuard |
| `src/pages/Organization.tsx` | Wrap settings changes in SubscriptionGuard |
| `src/pages/SuperAdmin.tsx` | Add trial_end_date display and edit |
| `src/App.tsx` | Add SubscriptionContext provider, handle SUSPENDED redirect |

---

## 6. Database Schema Changes

### PocketBase `organizations` Collection

Add the following field:

| Field | Type | Description |
|-------|------|-------------|
| `trial_end_date` | DateTime | When trial expires (created + 14 days) |

**PocketBase Admin UI Steps**:
1. Go to Collections → organizations
2. Add field: `trial_end_date` (Type: DateTime, Optional: Yes)
3. For existing TRIAL orgs, manually set `trial_end_date` or run migration

### Migration for Existing Organizations

Run in PocketBase SQL/JS:
```javascript
// In pb_hooks or admin console
const orgs = await $app.dao().findRecordsByFilter(
  'organizations',
  "subscription_status = 'TRIAL' && trial_end_date = ''"
);

for (const org of orgs) {
  const created = new Date(org.created);
  const trialEnd = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
  org.set('trial_end_date', trialEnd.toISOString());
  await $app.dao().saveRecord(org);
}
```

---

## 7. Backend Implementation

### 7.1 Update Registration Hook

**File**: `Others/pb_hooks/main.pb.js`

Find the organization creation section (around line 50) and add `trial_end_date`:

```javascript
// After creating org record
org.set("name", body.orgName);
org.set("subscription_status", "TRIAL");

// ADD THIS: Set trial end date to 14 days from now
const trialEndDate = new Date();
trialEndDate.setDate(trialEndDate.getDate() + 14);
org.set("trial_end_date", trialEndDate.toISOString());

$app.dao().saveRecord(org);
```

### 7.2 Add Subscription Check Endpoint

**File**: `Others/pb_hooks/main.pb.js`

Add a new endpoint to check subscription status:

```javascript
// Subscription status check endpoint
routerAdd("GET", "/api/openhr/subscription-status", (c) => {
  const authRecord = c.get("authRecord");
  if (!authRecord) {
    return c.json(401, { error: "Unauthorized" });
  }

  const orgId = authRecord.get("organization_id");
  if (!orgId) {
    // Super Admin has no org - always active
    return c.json(200, {
      status: "ACTIVE",
      isSuperAdmin: true
    });
  }

  try {
    const org = $app.dao().findRecordById("organizations", orgId);
    const status = org.get("subscription_status") || "TRIAL";
    const trialEndDate = org.get("trial_end_date");

    let daysRemaining = null;
    if (status === "TRIAL" && trialEndDate) {
      const endDate = new Date(trialEndDate);
      const now = new Date();
      daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) daysRemaining = 0;
    }

    return c.json(200, {
      status: status,
      trialEndDate: trialEndDate,
      daysRemaining: daysRemaining,
      isSuperAdmin: false
    });
  } catch (err) {
    return c.json(500, { error: "Failed to fetch subscription status" });
  }
}, $apis.requireRecordAuth());
```

### 7.3 Auto-Expiration Cron Job

**File**: `Others/pb_hooks/cron.pb.js`

Add a new cron job to automatically expire trials:

```javascript
// Auto-expire trials - runs daily at midnight
cronAdd("autoExpireTrials", "0 0 * * *", () => {
  console.log("[CRON] Running trial auto-expiration check...");

  try {
    const now = new Date().toISOString();

    // Find all TRIAL organizations where trial_end_date has passed
    const expiredTrials = $app.dao().findRecordsByFilter(
      "organizations",
      `subscription_status = "TRIAL" && trial_end_date != "" && trial_end_date < "${now}"`
    );

    console.log(`[CRON] Found ${expiredTrials.length} expired trials`);

    for (const org of expiredTrials) {
      org.set("subscription_status", "EXPIRED");
      $app.dao().saveRecord(org);
      console.log(`[CRON] Expired organization: ${org.get("name")} (${org.id})`);

      // Optionally send notification email to org admin
      // Find admin user of this org and send email
      try {
        const admins = $app.dao().findRecordsByFilter(
          "users",
          `organization_id = "${org.id}" && role = "ADMIN"`
        );

        if (admins.length > 0) {
          const admin = admins[0];
          const message = new MailerMessage({
            from: {
              address: $app.settings().meta.senderAddress,
              name: $app.settings().meta.senderName
            },
            to: [{ address: admin.email() }],
            subject: "OpenHR Trial Expired - " + org.get("name"),
            html: `
              <h2>Your OpenHR Trial Has Expired</h2>
              <p>Dear ${admin.get("name")},</p>
              <p>Your 14-day trial for <strong>${org.get("name")}</strong> has ended.</p>
              <p>Your account is now in read-only mode. To continue using all features:</p>
              <ul>
                <li>Contact our team to upgrade to an Active subscription</li>
                <li>Your data is safe and will remain accessible in read-only mode</li>
              </ul>
              <p>Thank you for trying OpenHR!</p>
            `
          });
          $app.newMailClient().send(message);
        }
      } catch (emailErr) {
        console.log(`[CRON] Failed to send expiration email: ${emailErr}`);
      }
    }

    console.log("[CRON] Trial auto-expiration completed");
  } catch (err) {
    console.log(`[CRON] Error in auto-expiration: ${err}`);
  }
});
```

---

## 8. Frontend Implementation

### 8.1 Update Types

**File**: `src/types.ts`

```typescript
// Update Organization interface
export interface Organization {
  id: string;
  name: string;
  address?: string;
  logo?: string;
  subscriptionStatus?: SubscriptionStatus;
  trialEndDate?: string;  // ADD THIS
  created?: string;
  updated?: string;
  userCount?: number;
  adminEmail?: string;
}

// ADD: Subscription info interface
export interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialEndDate?: string;
  daysRemaining?: number;
  isSuperAdmin: boolean;
  isReadOnly: boolean;  // true for EXPIRED
  isBlocked: boolean;   // true for SUSPENDED
}
```

### 8.2 Create Subscription Context

**File**: `src/context/SubscriptionContext.tsx` (NEW FILE)

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SubscriptionStatus, SubscriptionInfo } from '../types';
import { apiClient } from '../services/api.client';

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  canPerformAction: (action: 'write' | 'read') => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    try {
      const response = await apiClient.pb.send('/api/openhr/subscription-status', {
        method: 'GET'
      });

      setSubscription({
        status: response.status,
        trialEndDate: response.trialEndDate,
        daysRemaining: response.daysRemaining,
        isSuperAdmin: response.isSuperAdmin,
        isReadOnly: response.status === 'EXPIRED',
        isBlocked: response.status === 'SUSPENDED'
      });
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      // Default to blocked if we can't verify
      setSubscription({
        status: 'SUSPENDED',
        isSuperAdmin: false,
        isReadOnly: true,
        isBlocked: true
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const canPerformAction = useCallback((action: 'write' | 'read'): boolean => {
    if (!subscription) return false;
    if (subscription.isSuperAdmin) return true;
    if (subscription.isBlocked) return false;
    if (action === 'read') return true;
    if (action === 'write') return !subscription.isReadOnly;
    return false;
  }, [subscription]);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isLoading,
      refreshSubscription,
      canPerformAction
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
```

### 8.3 Create Subscription Guard Component

**File**: `src/components/SubscriptionGuard.tsx` (NEW FILE)

```typescript
import React from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { AlertTriangle } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  action?: 'write' | 'read';
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  action = 'write',
  fallback,
  showMessage = true
}) => {
  const { subscription, canPerformAction } = useSubscription();

  if (canPerformAction(action)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showMessage) {
    return null;
  }

  const getMessage = () => {
    if (subscription?.status === 'EXPIRED') {
      return 'Your trial has expired. Upgrade to continue using this feature.';
    }
    if (subscription?.status === 'SUSPENDED') {
      return 'Your account is suspended. Contact support for assistance.';
    }
    return 'This feature is not available with your current subscription.';
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{getMessage()}</span>
    </div>
  );
};

// HOC version for wrapping buttons/actions
export const withSubscriptionGuard = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  action: 'write' | 'read' = 'write'
) => {
  return (props: P & { disabled?: boolean }) => {
    const { canPerformAction, subscription } = useSubscription();
    const isAllowed = canPerformAction(action);

    return (
      <WrappedComponent
        {...props}
        disabled={props.disabled || !isAllowed}
        title={!isAllowed ? `Requires ${subscription?.status === 'EXPIRED' ? 'active subscription' : 'access'}` : undefined}
      />
    );
  };
};
```

### 8.4 Create Subscription Banner Component

**File**: `src/components/SubscriptionBanner.tsx` (NEW FILE)

```typescript
import React from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';

export const SubscriptionBanner: React.FC = () => {
  const { subscription } = useSubscription();

  if (!subscription || subscription.isSuperAdmin) return null;

  // Trial banner with countdown
  if (subscription.status === 'TRIAL' && subscription.daysRemaining !== undefined) {
    const isUrgent = subscription.daysRemaining <= 3;

    return (
      <div className={`px-4 py-2 flex items-center justify-between text-sm ${
        isUrgent
          ? 'bg-red-50 border-b border-red-200 text-red-700'
          : 'bg-amber-50 border-b border-amber-200 text-amber-700'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>
            {subscription.daysRemaining === 0
              ? 'Your trial expires today!'
              : `Trial: ${subscription.daysRemaining} day${subscription.daysRemaining === 1 ? '' : 's'} remaining`
            }
          </span>
        </div>
        <button className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary-hover">
          Upgrade Now
        </button>
      </div>
    );
  }

  // Expired banner
  if (subscription.status === 'EXPIRED') {
    return (
      <div className="px-4 py-2 flex items-center justify-between text-sm bg-red-50 border-b border-red-200 text-red-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Your trial has expired. You are in read-only mode.</span>
        </div>
        <button className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">
          Upgrade to Continue
        </button>
      </div>
    );
  }

  return null;
};
```

### 8.5 Create Suspended Page Component

**File**: `src/components/SuspendedPage.tsx` (NEW FILE)

```typescript
import React from 'react';
import { XCircle, Mail, Phone } from 'lucide-react';

interface SuspendedPageProps {
  organizationName?: string;
  onLogout: () => void;
}

export const SuspendedPage: React.FC<SuspendedPageProps> = ({
  organizationName,
  onLogout
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Account Suspended
        </h1>

        {organizationName && (
          <p className="text-slate-500 mb-4">{organizationName}</p>
        )}

        <p className="text-slate-600 mb-6">
          Your organization's account has been suspended. This may be due to:
        </p>

        <ul className="text-left text-slate-600 mb-6 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Payment issues or subscription lapse</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Terms of service violation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Administrative action pending review</span>
          </li>
        </ul>

        <div className="border-t pt-6 mb-6">
          <p className="text-slate-600 mb-4">Contact us to resolve this issue:</p>
          <div className="flex flex-col gap-2 text-sm">
            <a href="mailto:support@openhr.com" className="flex items-center justify-center gap-2 text-primary hover:underline">
              <Mail className="w-4 h-4" />
              support@openhr.com
            </a>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
```

### 8.6 Update AuthContext

**File**: `src/context/AuthContext.tsx`

Add subscription check after login:

```typescript
// In the login function, after successful authentication:
const login = async (email: string, password: string) => {
  // ... existing login code ...

  // After successful auth, check subscription status
  const orgId = authData.record.organization_id;
  if (orgId) {
    try {
      const org = await apiClient.pb.collection('organizations').getOne(orgId);
      if (org.subscription_status === 'SUSPENDED') {
        // Logout and throw error
        apiClient.pb.authStore.clear();
        throw new Error('ACCOUNT_SUSPENDED');
      }
    } catch (err: any) {
      if (err.message === 'ACCOUNT_SUSPENDED') {
        throw err;
      }
      // Org fetch failed, allow login but log warning
      console.warn('Could not verify subscription status');
    }
  }

  // ... rest of login code ...
};
```

### 8.7 Update Login Page

**File**: `src/pages/Login.tsx`

Handle SUSPENDED error:

```typescript
// In the login submit handler:
try {
  await login(email, password);
  // ... success handling ...
} catch (error: any) {
  if (error.message === 'ACCOUNT_SUSPENDED') {
    setError('Your organization account has been suspended. Please contact support.');
  } else {
    setError('Invalid email or password');
  }
}
```

### 8.8 Update App.tsx

**File**: `src/App.tsx`

Wrap with SubscriptionProvider and add banner:

```typescript
import { SubscriptionProvider } from './context/SubscriptionContext';
import { SubscriptionBanner } from './components/SubscriptionBanner';
import { SuspendedPage } from './components/SuspendedPage';

// In the main App component:
function App() {
  // ... existing code ...

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ThemeProvider>
          {/* Add banner at top of authenticated layout */}
          {user && <SubscriptionBanner />}
          {/* ... rest of app ... */}
        </ThemeProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
```

### 8.9 Update Pages with Guards

**Example: Attendance.tsx**

```typescript
import { SubscriptionGuard } from '../components/SubscriptionGuard';
import { useSubscription } from '../context/SubscriptionContext';

// In the component:
const { canPerformAction } = useSubscription();

// Wrap punch button:
<SubscriptionGuard action="write">
  <button onClick={handlePunchIn} className="...">
    Punch In
  </button>
</SubscriptionGuard>

// Or disable button directly:
<button
  onClick={handlePunchIn}
  disabled={!canPerformAction('write')}
  className="..."
>
  Punch In
</button>
```

---

## 9. Cron Job for Auto-Expiration

The cron job in `pb_hooks/cron.pb.js` will:

1. Run daily at midnight (00:00)
2. Find all organizations with:
   - `subscription_status = "TRIAL"`
   - `trial_end_date` has passed
3. Update status to `EXPIRED`
4. Send notification email to org admin

**Manual Trigger (for testing)**:

In PocketBase Admin Console, you can run:
```javascript
// Manually trigger expiration check
cronCall("autoExpireTrials");
```

---

## 10. Testing Checklist

### Registration Flow
- [ ] New org gets `subscription_status = "TRIAL"`
- [ ] New org gets `trial_end_date = now + 14 days`
- [ ] Trial countdown shows correctly in dashboard

### Trial Status
- [ ] All features work during trial
- [ ] Days remaining countdown accurate
- [ ] Warning banner shows in last 3 days

### Expired Status
- [ ] Auto-expiration cron runs correctly
- [ ] Status changes from TRIAL to EXPIRED after 14 days
- [ ] Read-only mode activates:
  - [ ] Cannot punch attendance
  - [ ] Cannot create leave requests
  - [ ] Cannot add employees
  - [ ] Cannot modify settings
  - [ ] CAN view all data
- [ ] Expired banner shows with upgrade button
- [ ] Expiration email sent to admin

### Active Status
- [ ] Super Admin can change status to ACTIVE
- [ ] All features work
- [ ] No banners shown

### Suspended Status
- [ ] Super Admin can suspend organization
- [ ] Users cannot login (blocked at login)
- [ ] Suspension message shows
- [ ] Data preserved

### Super Admin
- [ ] Can view all organizations
- [ ] Can change subscription status
- [ ] Can set trial_end_date manually
- [ ] Not affected by any restrictions

---

## Summary

This implementation provides:

1. **Abuse Prevention**: 14-day trial with automatic expiration prevents unlimited free usage
2. **Graceful Degradation**: EXPIRED mode allows data access while restricting writes
3. **Administrative Control**: SUSPENDED mode gives complete lockout capability
4. **User Experience**: Clear banners and countdowns inform users of status
5. **Automation**: Cron job handles trial expiration without manual intervention

The system is designed to be fair to users (data always accessible in read-only mode) while protecting the platform from abuse.
