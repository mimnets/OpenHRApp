# Organization Showcase — Landing Page Feature

## Overview

A public-facing section on the landing page that displays organizations using or contributing to OpenHR. This builds trust and social proof for new visitors. Super Admin has full CRUD control over which organizations appear.

---

## Feature Details

### Landing Page Section: "Trusted By" / "Organizations Using OpenHR"

**Display:** A horizontally scrolling logo carousel or grid section showing:
- Organization logo
- Organization name
- Country (optional, with flag)
- Short tagline or industry (optional)

**Design:**
```
──────────────────────────────────────────────────
  Trusted by teams around the world

  [Logo]        [Logo]        [Logo]        [Logo]
  Acme Corp     TechBD Ltd    GlobalHR      StartupX
  USA           Bangladesh    UAE           Singapore
──────────────────────────────────────────────────
```

- Logos displayed in a clean grid (desktop: 4-6 per row, mobile: 2 per row)
- Auto-scroll carousel option for many entries
- Grayscale logos that colorize on hover (common trust-building pattern)
- Optional: click on logo opens their website (if URL provided)

---

## Database: New Collection `showcase_organizations`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Auto | Yes | PocketBase auto ID |
| `name` | Plain Text | Yes | Organization display name |
| `logo` | File | Yes | Organization logo image |
| `country` | Plain Text | No | Country name or ISO code |
| `industry` | Plain Text | No | e.g. "Technology", "Manufacturing", "Healthcare" |
| `website_url` | URL | No | Link to org's website |
| `tagline` | Plain Text | No | Short description, e.g. "Leading HR solutions in SE Asia" |
| `display_order` | Number | No | Controls sort order on landing page (lower = first) |
| `is_active` | Boolean | Yes | Toggle visibility without deleting |
| `created` | Auto | Yes | PocketBase auto timestamp |

**PocketBase API Rules:**
- **List/View:** No auth required (public landing page needs to read this)
- **Create/Update/Delete:** Super Admin only

---

## Super Admin CRUD Panel

**Location:** Super Admin Dashboard > New tab "SHOWCASE" (or within existing management tabs)

### List View
- Table/card grid showing all showcase organizations
- Columns: Logo thumbnail, Name, Country, Industry, Active status, Order, Actions
- Toggle switch for `is_active` (inline, no modal needed)
- Drag-to-reorder or manual order number input

### Add/Edit Modal
- Logo upload (drag & drop or file picker, preview shown)
- Name (required)
- Country (dropdown or text)
- Industry (dropdown with common options + custom)
- Website URL (optional)
- Tagline (optional)
- Display Order (number)
- Active toggle

### Delete
- Confirmation dialog: "Remove [Org Name] from showcase?"
- Hard delete (no soft delete needed — this is curated content)

---

## Implementation Steps

| # | File | Action | What |
|---|------|--------|------|
| 1 | PocketBase Admin | MANUAL | Create `showcase_organizations` collection with fields above |
| 2 | `src/types.ts` | MODIFY | Add `ShowcaseOrganization` interface |
| 3 | `src/services/showcase.service.ts` | CREATE | CRUD service — getAll (public, no auth), create/update/delete (super admin) |
| 4 | `src/services/hrService.ts` | MODIFY | Wire showcase service methods |
| 5 | `src/components/landing/ShowcaseSection.tsx` | CREATE | Landing page section — logo grid/carousel, fetches public data |
| 6 | Landing page file | MODIFY | Import and place `ShowcaseSection` component |
| 7 | `src/components/superadmin/ShowcaseManagement.tsx` | CREATE | Super Admin CRUD panel — list, add/edit modal, delete, reorder |
| 8 | Super Admin dashboard page | MODIFY | Add SHOWCASE tab, import management component |

---

## Type Definition

```typescript
export interface ShowcaseOrganization {
  id: string;
  name: string;
  logo: string;        // File URL
  country?: string;
  industry?: string;
  websiteUrl?: string;
  tagline?: string;
  displayOrder: number;
  isActive: boolean;
  created?: string;
}
```

---

## Service Layer

```typescript
// showcase.service.ts

export const showcaseService = {
  // Public — no auth required (for landing page)
  async getActiveShowcase(): Promise<ShowcaseOrganization[]> {
    // Fetch where is_active = true, sort by display_order
    // This endpoint needs NO authentication — configure PocketBase API rules accordingly
  },

  // Super Admin only
  async getAll(): Promise<ShowcaseOrganization[]> { ... },
  async create(data: Partial<ShowcaseOrganization>): Promise<void> { ... },
  async update(id: string, data: Partial<ShowcaseOrganization>): Promise<void> { ... },
  async delete(id: string): Promise<void> { ... },
};
```

---

## Landing Page Component Design

### Desktop Layout
```
┌─────────────────────────────────────────────────────┐
│           Trusted by organizations worldwide         │
│                                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │ Logo │  │ Logo │  │ Logo │  │ Logo │  │ Logo │ │
│  │ Name │  │ Name │  │ Name │  │ Name │  │ Name │ │
│  │  BD  │  │  US  │  │  AE  │  │  IN  │  │  SG  │ │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘ │
└─────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌───────────────────────┐
│  Trusted by teams     │
│  around the world     │
│                       │
│  ┌──────┐  ┌──────┐  │
│  │ Logo │  │ Logo │  │
│  │ Name │  │ Name │  │
│  └──────┘  └──────┘  │
│  ┌──────┐  ┌──────┐  │
│  │ Logo │  │ Logo │  │
│  │ Name │  │ Name │  │
│  └──────┘  └──────┘  │
│        ← scroll →     │
└───────────────────────┘
```

---

## Edge Cases

- **No showcase entries:** Hide the entire section from the landing page (don't show an empty "Trusted by" with nothing in it)
- **Logo sizing:** Enforce consistent aspect ratio (e.g. max 120x60px display), contain-fit with padding
- **Broken logo:** Show a placeholder with the org's initial letter (same pattern as user avatars)
- **Many entries (20+):** Switch to auto-scrolling carousel with pause-on-hover

---

## Notes

- This is entirely admin-curated content, NOT auto-populated from registered organizations. Super Admin manually adds organizations they want to showcase.
- Consider adding a "Featured" or "Contributor" badge option for organizations that have donated or contributed code.
- The showcase data is public (no auth for reads) — do not include any sensitive organization data in this collection.
