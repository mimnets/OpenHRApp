# Country-Based Organization Registration & Holiday System

## Problem

Currently OpenHR is hardcoded with Bangladesh (BD) holidays and defaults. Since the app targets a global audience, organizations need to select their country during registration, and holidays should be auto-populated based on that country.

---

## Feature Overview

### 1. Country Selection During Organization Registration

**Where:** Registration flow (`registerOrganization` in `auth.service.ts`)

**What changes:**
- Add a **Country** dropdown to the registration form (searchable, with flag icons)
- Store the selected country code (ISO 3166-1 alpha-2, e.g. `BD`, `US`, `IN`, `AE`) on the `organizations` collection as a new `country` field
- The country selection drives:
  - Default holidays auto-populated for that country
  - Default currency & timezone pre-filled in AppConfig
  - Default working days pre-filled (e.g. UAE = Sun-Thu, US = Mon-Fri, BD = Sun-Thu)

### 2. Country-Based Holiday Data

**Approach: Static bundled dataset (recommended for v1)**

Create a `src/data/holidays/` directory with per-country JSON files:

```
src/data/holidays/
  BD.json    # Bangladesh
  US.json    # United States
  IN.json    # India
  AE.json    # UAE
  SA.json    # Saudi Arabia
  GB.json    # United Kingdom
  ...
```

Each file follows the existing `Holiday` interface:
```json
[
  {
    "id": "us-h1",
    "date": "2026-01-01",
    "name": "New Year's Day",
    "isGovernment": true,
    "type": "NATIONAL"
  },
  {
    "id": "us-h2",
    "date": "2026-07-04",
    "name": "Independence Day",
    "isGovernment": true,
    "type": "NATIONAL"
  }
]
```

**On registration:** The system reads the country's holiday file and writes it into the `settings` collection (key: `holidays`) for that organization — same as current behavior, just country-specific instead of hardcoded BD.

### 3. Country Defaults Mapping

Create a `src/data/countryDefaults.ts`:

```typescript
export const COUNTRY_DEFAULTS: Record<string, {
  currency: string;
  timezone: string;
  workingDays: string[];
  dateFormat: string;
}> = {
  BD: {
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
    workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'],
    dateFormat: 'DD/MM/YYYY'
  },
  US: {
    currency: 'USD',
    timezone: 'America/New_York',
    workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
    dateFormat: 'MM/DD/YYYY'
  },
  AE: {
    currency: 'AED',
    timezone: 'Asia/Dubai',
    workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'],
    dateFormat: 'DD/MM/YYYY'
  },
  // ... more countries
};
```

---

## Database Changes

### `organizations` collection (PocketBase)

#### Adding the `country` field — Step by Step

1. Open **PocketBase Admin UI** (e.g. `http://localhost:8090/_/`)
2. Go to **Collections** > click on **`organizations`**
3. Click **New field** (+ button)
4. Configure the field:
   - **Field name:** `country`
   - **Type:** `Plain Text`
   - **Required:** Yes (for new registrations; set to No temporarily if you have existing orgs without country)
   - **Max length:** `2` (ISO 3166-1 alpha-2 codes are exactly 2 characters)
   - **Pattern (Regex validation):** `^[A-Z]{2}$` — This enforces uppercase 2-letter ISO codes only
5. Click **Save**

> **Why Plain Text with regex instead of Select?**
> Select fields require a predefined list in PocketBase schema, which means updating the schema every time you add a country. Plain Text with `^[A-Z]{2}$` validation accepts any valid ISO code while the frontend dropdown controls which countries are available.

#### Backfilling existing organizations

For organizations registered before this feature, run this in PocketBase Admin > **API Preview** or via a migration hook:

```javascript
// pb_hooks migration — run once
// File: Others/pb_hooks/migrate_country.pb.js

onAfterBootstrap((e) => {
  try {
    const orgs = $app.dao().findRecordsByFilter("organizations", "country = ''", "", 0, 0);
    for (const org of orgs) {
      org.set("country", "BD"); // Default existing orgs to BD (Bangladesh)
      $app.dao().saveRecord(org);
    }
    console.log(`Backfilled ${orgs.length} organizations with default country BD`);
  } catch (err) {
    // No orgs to backfill or field doesn't exist yet — safe to ignore
  }
});
```

Alternatively, manually update via PocketBase Admin UI for each existing org.

### `settings` collection
- No schema changes — holidays are already stored here per organization

---

## Can Admin Change Country Later?

**Yes — using the Merge Strategy.**

### Merge Strategy (Option A)

When admin changes country from the Organization > SYSTEM tab:

1. **Fetch new country's holiday list** from the bundled data
2. **Compare** with existing holidays in the `settings` collection
3. **Show a confirmation modal** with 3 choices:

#### Choice 1: Replace All
- Delete all current holidays
- Load the new country's default holiday list
- **Best for:** Org that set wrong country initially, hasn't customized holidays yet

#### Choice 2: Merge with Existing
- Keep all existing holidays (including custom ones admin added)
- Add new country's holidays, **skipping duplicates by date**
- If a date conflict exists (same date, different name), keep the existing one
- **Best for:** Org expanding to a new region, wants both sets of holidays

#### Choice 3: Keep Current
- Only update the `country` field on the organization record
- Don't touch the holidays at all
- Working days, currency, timezone remain unchanged
- **Best for:** Org that just needs to correct their country code, holidays are already manually configured

### UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Change Country                            │
│                                                             │
│  Current: Bangladesh (BD)                                   │
│  New:     [United Arab Emirates (AE) ▼]                     │
│                                                             │
│  ─────────────────────────────────────────────────          │
│                                                             │
│  How should holidays be handled?                            │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │ ● Replace All Holidays                          │        │
│  │   Remove 9 existing holidays.                   │        │
│  │   Load 12 UAE holidays for 2026.                │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │ ○ Merge with Existing                           │        │
│  │   Keep 9 existing holidays.                     │        │
│  │   Add 12 UAE holidays (skip date conflicts).    │        │
│  │   Result: up to 21 holidays.                    │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │ ○ Keep Current Holidays                         │        │
│  │   Only update country to AE.                    │        │
│  │   No changes to holiday list.                   │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│               [Cancel]    [Confirm Change]                  │
└─────────────────────────────────────────────────────────────┘
```

### Merge Logic (Pseudocode)

```typescript
async function handleCountryChange(
  newCountryCode: string,
  strategy: 'REPLACE' | 'MERGE' | 'KEEP',
  currentHolidays: Holiday[]
) {
  // 1. Update country on organization record
  await updateOrganizationCountry(newCountryCode);

  if (strategy === 'KEEP') return; // Done — no holiday changes

  // 2. Load new country's holidays
  const newCountryHolidays = await loadCountryHolidays(newCountryCode);

  if (strategy === 'REPLACE') {
    // Straight replacement
    await hrService.setHolidays(newCountryHolidays);
    return;
  }

  if (strategy === 'MERGE') {
    // Build a date set from existing holidays
    const existingDates = new Set(currentHolidays.map(h => h.date));

    // Only add new country holidays that don't conflict by date
    const merged = [
      ...currentHolidays,
      ...newCountryHolidays.filter(h => !existingDates.has(h.date))
    ];

    // Sort by date
    merged.sort((a, b) => a.date.localeCompare(b.date));

    await hrService.setHolidays(merged);
  }
}
```

### What Else Changes on Country Switch?

Besides holidays, the admin should also be prompted about updating:

| Setting | Auto-update? | Notes |
|---------|-------------|-------|
| Holidays | User chooses (Replace/Merge/Keep) | Core of this feature |
| Currency | Suggest new default, admin confirms | Don't force — they may use USD globally |
| Timezone | Suggest new default, admin confirms | Critical for attendance calculations |
| Working Days | Suggest new default, admin confirms | Per-shift working days in SHIFTS tab take priority |
| Date Format | Suggest new default, admin confirms | Display preference |

Show these as optional toggles below the holiday strategy picker:
```
□ Also update currency to AED
□ Also update timezone to Asia/Dubai
□ Also update default working days to Sun-Thu
□ Also update date format to DD/MM/YYYY
```

---

## Implementation Steps

| # | File | Action | What |
|---|------|--------|------|
| 1 | `src/data/holidays/*.json` | CREATE | Holiday data files per country (start with 12 priority countries) |
| 2 | `src/data/countryDefaults.ts` | CREATE | Currency, timezone, working days, date format per country |
| 3 | `src/data/countries.ts` | CREATE | Full country list: `{ code, name, flag, phoneCode }` |
| 4 | `src/types.ts` | MODIFY | Add `country?: string` to `Organization` interface |
| 5 | `src/services/auth.service.ts` | MODIFY | Accept country in registration, store on organization, load country holidays |
| 6 | Registration page/component | MODIFY | Add searchable country dropdown to registration form |
| 7 | `src/services/organization.service.ts` | MODIFY | On first config setup, use country defaults instead of hardcoded BD |
| 8 | `src/constants.tsx` | MODIFY | Replace hardcoded `BD_HOLIDAYS` with dynamic country loader function |
| 9 | `src/components/organization/OrgSystem.tsx` | MODIFY | Add "Change Country" button with merge strategy modal |
| 10 | `src/services/country.service.ts` | CREATE | `loadCountryHolidays()`, `getCountryDefaults()`, `handleCountryChange()` |
| 11 | PocketBase Admin | MANUAL | Add `country` field to `organizations` (Plain Text, `^[A-Z]{2}$`) |
| 12 | `Others/pb_hooks/migrate_country.pb.js` | CREATE | Backfill existing orgs with default country |

---

## Priority Countries (Phase 1)

| Code | Country | Currency | Timezone | Working Days | Flag |
|------|---------|----------|----------|-------------|------|
| BD | Bangladesh | BDT | Asia/Dhaka | Sun-Thu | 🇧🇩 |
| IN | India | INR | Asia/Kolkata | Mon-Sat | 🇮🇳 |
| US | United States | USD | America/New_York | Mon-Fri | 🇺🇸 |
| GB | United Kingdom | GBP | Europe/London | Mon-Fri | 🇬🇧 |
| AE | UAE | AED | Asia/Dubai | Sun-Thu | 🇦🇪 |
| SA | Saudi Arabia | SAR | Asia/Riyadh | Sun-Thu | 🇸🇦 |
| PK | Pakistan | PKR | Asia/Karachi | Mon-Sat | 🇵🇰 |
| MY | Malaysia | MYR | Asia/Kuala_Lumpur | Mon-Fri | 🇲🇾 |
| SG | Singapore | SGD | Asia/Singapore | Mon-Fri | 🇸🇬 |
| PH | Philippines | PHP | Asia/Manila | Mon-Fri | 🇵🇭 |
| NG | Nigeria | NGN | Africa/Lagos | Mon-Fri | 🇳🇬 |
| EG | Egypt | EGP | Africa/Cairo | Sun-Thu | 🇪🇬 |

---

## Country Data File Format (`src/data/countries.ts`)

```typescript
export interface Country {
  code: string;      // ISO 3166-1 alpha-2 (e.g. "BD")
  name: string;      // Display name (e.g. "Bangladesh")
  flag: string;      // Emoji flag (e.g. "🇧🇩")
  phoneCode: string; // Dialing code (e.g. "+880")
}

export const COUNTRIES: Country[] = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', phoneCode: '+93' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', phoneCode: '+355' },
  // ... full list of 195+ countries
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', phoneCode: '+880' },
  // ...
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', phoneCode: '+263' },
];

// Helper to get flag emoji from ISO code
export const getFlagEmoji = (code: string): string => {
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
    .join('');
};
```

> **Note:** The `getFlagEmoji()` function converts any 2-letter ISO code to its flag emoji dynamically using Unicode regional indicator symbols. No need to hardcode flags.

---

## Notes

- Islamic holidays (Eid, Ramadan) shift yearly — for v1, use fixed approximate dates for current year and let admins adjust. For v2, consider Hijri calendar integration or an external API.
- Some countries have state/province-level holidays (US, India) — for v1, include only federal/national holidays. State-level can be added manually by admin through the existing HOLIDAYS tab.
- The existing holiday CRUD in Organization > HOLIDAYS tab remains fully functional — country defaults are just the starting point.
- All 195+ countries should be available in the dropdown, but only the 12 priority countries will have pre-bundled holiday data. Others will start with an empty holiday list that admin can populate manually.
