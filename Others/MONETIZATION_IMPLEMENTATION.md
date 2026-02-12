# OpenHR Monetization Implementation Guide

This document outlines a community-friendly monetization model for OpenHR that doesn't require direct sales.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Monetization Options](#2-monetization-options)
3. [Database Schema](#3-database-schema)
4. [Implementation Plan](#4-implementation-plan)
5. [Ad Placement Strategy](#5-ad-placement-strategy)
6. [UI/UX Design](#6-uiux-design)
7. [Files to Create/Modify](#7-files-to-createmodify)

---

## 1. Overview

### Current Subscription Flow
```
Registration → TRIAL (14 days) → EXPIRED (read-only) → Contact Admin
```

### Proposed New Flow
```
Registration → TRIAL (14 days) → EXPIRED → Upgrade Page
                                              ↓
                              ┌───────────────┼───────────────┐
                              ↓               ↓               ↓
                         Donate &        Request Trial    Accept Ads
                         Go ACTIVE       Extension        (AD_SUPPORTED)
```

### New Subscription Statuses
| Status | Description | Features | Ads |
|--------|-------------|----------|-----|
| TRIAL | 14-day free trial | Full access | No |
| ACTIVE | Donated/Approved | Full access | No |
| AD_SUPPORTED | Free with ads | Full access | Yes |
| EXPIRED | Trial ended, no action | Read-only | No |
| SUSPENDED | Admin blocked | No access | No |

---

## 2. Monetization Options

### Option A: Donation (Recommended: Ko-fi, Buy Me a Coffee, or PayPal)

**How it works:**
1. User clicks "Upgrade" → Redirected to donation page
2. After donation, user submits "Activation Request" with:
   - Transaction ID / Screenshot
   - Email used for donation
3. Super Admin reviews and activates to ACTIVE status

**Pros:**
- No payment gateway integration needed
- Works globally
- Simple to implement

**Suggested Amounts:**
- $5 - 3 months ACTIVE
- $10 - 6 months ACTIVE
- $20 - 12 months ACTIVE
- $50 - Lifetime ACTIVE

### Option B: Trial Extension Request

**How it works:**
1. User requests extension with reason (e.g., "Still evaluating", "Budget pending")
2. Super Admin reviews and can:
   - Extend trial by 7/14/30 days
   - Convert to AD_SUPPORTED
   - Reject with message

**Use Cases:**
- NGOs / Non-profits
- Startups
- Educational institutions

### Option C: Ad-Supported Free Tier

**How it works:**
1. User accepts to see ads
2. Status changes to AD_SUPPORTED
3. Ads shown in designated areas
4. Full functionality retained

**Ad Revenue Sources:**
- Google AdSense
- Carbon Ads (developer-focused)
- Direct sponsors
- Self-promotion (your other products)

---

## 3. Database Schema

### PocketBase Collections to Add/Modify

#### 3.1 Update `organizations` Collection

Add new fields:

| Field | Type | Description |
|-------|------|-------------|
| `subscription_status` | Select | Add: `AD_SUPPORTED` option |
| `subscription_expires` | DateTime | When current status expires (for time-limited ACTIVE) |
| `ad_consent` | Boolean | User accepted ads |
| `donation_tier` | Text | "MONTHLY_3", "MONTHLY_6", "YEARLY", "LIFETIME" |

#### 3.2 New Collection: `upgrade_requests`

| Field | Type | Description |
|-------|------|-------------|
| `organization_id` | Relation | Target: organizations |
| `request_type` | Select | "DONATION", "TRIAL_EXTENSION", "AD_SUPPORTED" |
| `status` | Select | "PENDING", "APPROVED", "REJECTED" |
| `donation_amount` | Number | Amount donated (if applicable) |
| `donation_reference` | Text | Transaction ID / Reference |
| `donation_screenshot` | File | Proof of payment |
| `extension_reason` | Text | Why they need extension |
| `extension_days` | Number | Days requested |
| `admin_notes` | Text | Super Admin's notes |
| `processed_by` | Relation | Super Admin who processed |
| `processed_at` | DateTime | When processed |

---

## 4. Implementation Plan

### Phase 1: Upgrade Page (Frontend)

Create a new page: `src/pages/Upgrade.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                     Upgrade Your Plan                        │
│                                                              │
│  Your trial has expired. Choose how to continue:            │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   💝 Donate     │  │  ⏰ Request     │  │  📺 Free     │ │
│  │                 │  │   Extension     │  │   with Ads   │ │
│  │  Support our    │  │                 │  │              │ │
│  │  open-source    │  │  Need more time │  │  Full access │ │
│  │  project        │  │  to evaluate?   │  │  with ads    │ │
│  │                 │  │                 │  │              │ │
│  │  From $5/3mo    │  │  Up to 30 days  │  │  Forever     │ │
│  │                 │  │                 │  │  Free        │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Donation Flow

1. **Donation Options Component**
   - Display Ko-fi / Buy Me a Coffee / PayPal buttons
   - Show pricing tiers

2. **Activation Request Form**
   - Transaction reference input
   - Screenshot upload
   - Email verification

3. **Request Tracking**
   - Show pending request status
   - Estimated processing time

### Phase 3: Trial Extension Flow

1. **Extension Request Form**
   - Reason selection (dropdown)
   - Custom message
   - Days requested (7/14/30)

2. **Super Admin Review Panel**
   - List pending requests
   - Approve/Reject with notes
   - Bulk actions

### Phase 4: Ad-Supported Flow

1. **Ad Consent Modal**
   - Explain what ads they'll see
   - Privacy notice
   - Accept/Decline buttons

2. **Instant Activation**
   - On accept → Status = AD_SUPPORTED
   - No admin review needed

---

## 5. Ad Placement Strategy

### Recommended Ad Locations

```
┌────────────────────────────────────────────────────────┐
│ HEADER                                                  │
├──────────┬─────────────────────────────────────────────┤
│          │                                              │
│ SIDEBAR  │              MAIN CONTENT                    │
│          │                                              │
│          │  ┌────────────────────────────────────────┐ │
│  [AD 1]  │  │                                        │ │
│  Banner  │  │         Dashboard / Page Content       │ │
│          │  │                                        │ │
│          │  └────────────────────────────────────────┘ │
│          │                                              │
│          │  [AD 2] - Horizontal Banner (728x90)        │
│          │                                              │
│          │  ┌────────────────────────────────────────┐ │
│          │  │         More Content                   │ │
│          │  └────────────────────────────────────────┘ │
│          │                                              │
├──────────┴─────────────────────────────────────────────┤
│ FOOTER - [AD 3] Sponsored Link                         │
└────────────────────────────────────────────────────────┘
```

### Ad Placement Rules

| Location | Size | Type | Pages |
|----------|------|------|-------|
| Sidebar Bottom | 300x250 | Display | All (except Attendance) |
| Below Dashboard Stats | 728x90 | Horizontal Banner | Dashboard only |
| Reports Page | 300x250 | Display | Reports only |
| Footer | Text | Sponsored Link | All pages |

### Pages to EXCLUDE Ads

- **Attendance Punch** - User needs focus, no distractions
- **Leave Request Form** - Critical workflow
- **Login/Register** - Bad UX
- **Super Admin** - Platform admin pages

### Ad Component Structure

```tsx
// src/components/ads/AdBanner.tsx
interface AdBannerProps {
  slot: 'sidebar' | 'dashboard' | 'reports' | 'footer';
  size: '300x250' | '728x90' | 'text';
}

// Only renders if user's org has AD_SUPPORTED status
```

---

## 6. UI/UX Design

### Upgrade Button in Banner

When trial expires, the "Upgrade Now" button should navigate to the Upgrade page:

```tsx
// SubscriptionBanner.tsx
<button onClick={() => onNavigate('upgrade')}>
  Upgrade Now
</button>
```

### Upgrade Page Layout

```
/upgrade

┌─────────────────────────────────────────────────────────────┐
│  [Back to Dashboard]                                        │
│                                                              │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║           🎉 Support OpenHR - Open Source HR          ║  │
│  ║                                                        ║  │
│  ║   OpenHR is free and open source. Your support        ║  │
│  ║   helps us maintain and improve the platform.         ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  OPTION 1: Support with Donation                      │   │
│  │                                                        │   │
│  │  ☕ Buy us a coffee and get full access:             │   │
│  │                                                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │  │  $5     │ │  $10    │ │  $20    │ │  $50    │    │   │
│  │  │ 3 months│ │ 6 months│ │ 1 year  │ │Lifetime │    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │
│  │                                                        │   │
│  │  [Ko-fi Button] [PayPal Button] [Buy Me Coffee]       │   │
│  │                                                        │   │
│  │  Already donated? [Submit Activation Request]         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  OPTION 2: Request Trial Extension                    │   │
│  │                                                        │   │
│  │  Need more time to evaluate? Request an extension.   │   │
│  │                                                        │   │
│  │  [Request Extension - Up to 30 days]                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  OPTION 3: Continue Free with Ads                     │   │
│  │                                                        │   │
│  │  Get full access for free. We'll show non-intrusive  │   │
│  │  ads to support our development.                      │   │
│  │                                                        │   │
│  │  [Accept & Continue Free]                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Activation Request Modal

```
┌─────────────────────────────────────────────┐
│  Submit Activation Request                   │
│                                              │
│  Donation Amount: [Dropdown: $5/$10/$20/$50]│
│                                              │
│  Transaction Reference:                      │
│  [________________________]                  │
│                                              │
│  Email used for donation:                    │
│  [________________________]                  │
│                                              │
│  Screenshot (optional):                      │
│  [Choose File] receipt.png                   │
│                                              │
│  [Cancel]              [Submit Request]      │
└─────────────────────────────────────────────┘
```

### Super Admin - Upgrade Requests Panel

Add to SuperAdmin.tsx:

```
┌─────────────────────────────────────────────────────────────┐
│  Upgrade Requests                               [Refresh]   │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Org: Acme Corp    Type: DONATION    Amount: $10        ││
│  │ Ref: TXN123456    Status: PENDING   Submitted: 2h ago  ││
│  │ [View Details] [Approve - 6 months] [Reject]           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Org: StartupXYZ   Type: TRIAL_EXTENSION                ││
│  │ Reason: Budget approval pending    Days: 14            ││
│  │ [View Details] [Approve] [Reject]                      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/pages/Upgrade.tsx` | Main upgrade page with 3 options |
| `src/components/upgrade/DonationOptions.tsx` | Donation tier cards |
| `src/components/upgrade/ActivationRequestForm.tsx` | Form to submit activation |
| `src/components/upgrade/ExtensionRequestForm.tsx` | Form to request extension |
| `src/components/upgrade/AdConsentModal.tsx` | Modal to accept ads |
| `src/components/ads/AdBanner.tsx` | Ad display component |
| `src/components/ads/AdPlaceholder.tsx` | Placeholder for ad slots |
| `src/services/upgrade.service.ts` | API calls for upgrade requests |
| `Others/pb_hooks/upgrade.pb.js` | Backend hooks for upgrade processing |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types.ts` | Add `UpgradeRequest` interface, update `SubscriptionStatus` |
| `src/App.tsx` | Add route for `/upgrade` page |
| `src/components/Sidebar.tsx` | Show ad slot for AD_SUPPORTED users |
| `src/pages/Dashboard.tsx` | Show ad slot for AD_SUPPORTED users |
| `src/pages/SuperAdmin.tsx` | Add "Upgrade Requests" tab |
| `src/services/superadmin.service.ts` | Add methods for processing requests |
| `src/components/subscription/SubscriptionBanner.tsx` | Link to upgrade page |
| `src/context/SubscriptionContext.tsx` | Handle AD_SUPPORTED status |
| `Others/pb_hooks/main.pb.js` | Add upgrade request endpoints |

---

## 8. Implementation Priority

### MVP (Minimum Viable Product)

1. ✅ Add `AD_SUPPORTED` to subscription statuses
2. Create basic Upgrade page with 3 options
3. Implement "Accept Ads" flow (instant activation)
4. Add donation links (external - Ko-fi, etc.)
5. Create activation request form
6. Add Super Admin request review panel

### Phase 2

1. Implement trial extension request flow
2. Add ad banner components
3. Integrate Google AdSense or similar
4. Email notifications for request status

### Phase 3

1. Automated donation verification (webhook from payment provider)
2. Subscription expiry tracking and reminders
3. Analytics dashboard for ad revenue
4. Multiple ad network support

---

## 9. Donation Platform Recommendations

### Ko-fi (Recommended)
- No fees on donations
- One-time and monthly options
- Easy to set up
- Widget embeddable

### Buy Me a Coffee
- 5% fee
- Good UI/UX
- Membership tiers
- Webhook support

### PayPal.me
- Standard PayPal fees
- Universal recognition
- Direct transfers
- No subscription management

### GitHub Sponsors
- If project is on GitHub
- 0% fees
- Tier-based sponsorship
- Good for open source credibility

---

## 10. Legal Considerations

### Privacy Policy Updates
- Mention ad display for AD_SUPPORTED users
- Data shared with ad networks
- Cookie usage for ads

### Terms of Service Updates
- Donation is voluntary, not a purchase
- No refund policy for donations
- Ad-supported tier terms

---

## Summary

This monetization model provides:

1. **Flexibility** - Users can choose their preferred method
2. **No Barriers** - Free option always available (with ads)
3. **Sustainability** - Multiple revenue streams
4. **Community-Friendly** - Supports open-source ethos
5. **Simple Admin** - Easy for Super Admin to manage

The key principle: **Never block users from using the software** - they can always choose the ad-supported option for full free access.

# Subscription

1. Go to PocketBase Admin → https://pocketbase.mimnets.com/_/
  2. Click "New Collection" button
  3. Set:
    - Name: upgrade_requests
    - Type: Base
  4. Add these fields one by one:
  ┌─────────────────────┬──────────┬─────────────────────────────────────────────────┐
  │     Field Name      │   Type   │                     Options                     │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ organization_id     │ Relation │ Collection: organizations, Single               │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ request_type        │ Select   │ Values: DONATION, TRIAL_EXTENSION, AD_SUPPORTED │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ status              │ Select   │ Values: PENDING, APPROVED, REJECTED             │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ donation_amount     │ Number   │                                                 │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ donation_tier       │ Text     │                                                 │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ donation_reference  │ Text     │                                                 │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ donation_screenshot │ File     │ Max size: 5MB, Types: image/*                   │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ extension_reason    │ Text     │                                                 │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ extension_days      │ Number   │ Min: 1, Max: 365                                │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ admin_notes         │ Text     │                                                 │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ processed_by        │ Relation │ Collection: users, Single                       │
  ├─────────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ processed_at        │ DateTime │                                                 │
  └─────────────────────┴──────────┴─────────────────────────────────────────────────┘
  5. Set API Rules:
    - List/View: @request.auth.role = "SUPER_ADMIN" || organization_id = @request.auth.organization_id
    - Create: @request.auth.id != ""
    - Update/Delete: @request.auth.role = "SUPER_ADMIN"
  6. Click Create
  7. Then go to organizations collection → Edit:
    - Add field ad_consent (Boolean)
    - Add field subscription_expires (DateTime)
    - Edit subscription_status field → Add AD_SUPPORTED to the values
  8. Delete the setup_collections.pb.js file from pb_hooks folder and restart PocketBase