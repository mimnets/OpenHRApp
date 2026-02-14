# Country-Based Registration Implementation Summary

## Overview
Implemented complete country-based organization registration with logo upload and address fields, plus the ability to change country from the admin dashboard.

---

## ✅ Completed Frontend Changes

### 1. Registration Form ([src/pages/RegisterOrganization.tsx](../src/pages/RegisterOrganization.tsx))

**Added Fields:**
- **Country Selector** - Searchable dropdown with flag emojis for all 90+ countries
- **Logo Upload** - File input with image preview (2MB limit, image files only)
- **Address Field** - Multi-line text area for organization address

**Features:**
- Country defaults to Bangladesh (BD)
- Logo preview shows selected image before upload
- Validation for logo file size and type
- All new fields integrated into the registration flow

### 2. Registration Service ([src/services/auth.service.ts](../src/services/auth.service.ts))

**Updated:**
- Changed from JSON payload to `FormData` to support file uploads
- Sends: `orgName`, `adminName`, `email`, `password`, `country`, `address` (optional), `logo` (optional)
- Maintains security best practices (password cleared from memory after sending)

### 3. Data Files Created

**Country Data ([src/data/countries.ts](../src/data/countries.ts)):**
- Already existed with 90+ countries
- Includes: code, name, phoneCode
- `getFlagEmoji()` helper function for flag emojis

**Country Defaults ([src/data/countryDefaults.ts](../src/data/countryDefaults.ts)):**
- Already existed with defaults for 22 countries
- Includes: currency, timezone, workingDays, dateFormat

**Holiday Data Files ([src/data/holidays/](../src/data/holidays/)):**
- ✅ `BD.json` - Bangladesh (8 holidays)
- ✅ `US.json` - United States (10 holidays)
- ✅ `IN.json` - India (8 holidays)
- ✅ `GB.json` - United Kingdom (8 holidays)
- ✅ `AE.json` - UAE (3 holidays)
- ✅ `SA.json` - Saudi Arabia (2 holidays)

**Note:** More countries can be added by creating additional JSON files in the same format.

### 4. Country Service ([src/services/country.service.ts](../src/services/country.service.ts))

**New Service Created:**
```typescript
countryService.loadCountryHolidays(countryCode) // Load holidays for a country
countryService.getCountryDefaults(countryCode)  // Get currency, timezone, etc.
countryService.hasHolidayData(countryCode)      // Check if country has holidays
countryService.mergeHolidays(existing, new)     // Merge holiday lists
```

### 5. Admin Dashboard ([src/components/organization/OrgSystem.tsx](../src/components/organization/OrgSystem.tsx))

**Added New Section: "Organization Identity"**
- Country selector (can be changed after registration)
- Logo upload with preview
- Address text area
- Separate "Save Organization" button

**Features:**
- Loads current organization data on mount
- Updates organization record directly in PocketBase
- Shows current logo if already uploaded
- Validates logo file size and type

### 6. TypeScript Types ([src/types.ts](../src/types.ts))

**Added:**
```typescript
export interface RegistrationData {
  orgName: string;
  adminName: string;
  email: string;
  password: string;
  country: string;
  address?: string;
  logo?: File | null;
}
```

**Already Existed:**
```typescript
export interface Organization {
  id: string;
  name: string;
  address?: string;      // ✅ Already defined
  logo?: string;         // ✅ Already defined
  country?: string;      // ✅ Already defined
  ...
}
```

---

## 🔧 Required Backend Changes (PocketBase)

### 1. Update `organizations` Collection Schema

**Ensure these fields exist:**
- `country` - Plain Text, Max length: 2, Regex: `^[A-Z]{2}$`, Required: Yes
- `address` - Plain Text or Long Text, Required: No
- `logo` - File (single), Required: No, Max file size: 2MB

**Migration for Existing Records:**
```javascript
// Set default country for existing organizations
// Run this once via PocketBase Admin > API Preview or pb_hooks
const orgs = $app.dao().findRecordsByFilter("organizations", "country = ''", "", 0, 0);
for (const org of orgs) {
  org.set("country", "BD"); // Default to Bangladesh
  $app.dao().saveRecord(org);
}
```

### 2. Update `/api/openhr/register` Endpoint

**Current Behavior:**
- Accepts JSON: `{ orgName, adminName, email, password }`

**New Behavior Required:**
- Accept `multipart/form-data` instead of JSON
- Parse additional fields: `country`, `address` (optional), `logo` (optional file)
- Create organization with all fields
- Auto-populate holidays based on country using the logic below

**Pseudocode:**
```javascript
// In pb_hooks/main.pb.js or registration endpoint
routerAdd("POST", "/api/openhr/register", (c) => {
  const data = $apis.requestInfo(c);

  // Extract fields
  const orgName = data.data.orgName;
  const adminName = data.data.adminName;
  const email = data.data.email;
  const password = data.data.password;
  const country = data.data.country || 'BD';
  const address = data.data.address || '';
  const logoFile = data.files.logo; // File object

  // 1. Create organization record
  const org = new Record($app.dao().findCollectionByNameOrId("organizations"));
  org.set("name", orgName);
  org.set("country", country);
  org.set("address", address);
  if (logoFile) {
    org.set("logo", logoFile);
  }
  org.set("subscriptionStatus", "TRIAL");
  org.set("trialEndDate", /* 14 days from now */);
  $app.dao().saveRecord(org);

  // 2. Create admin user
  const user = new Record($app.dao().findCollectionByNameOrId("users"));
  user.set("name", adminName);
  user.set("email", email);
  user.set("password", password);
  user.set("role", "ADMIN");
  user.set("organization_id", org.id);
  user.set("verified", false);
  $app.dao().saveRecord(user);

  // 3. Send verification email
  $app.dao().requestVerification(user);

  // 4. Load country-based holidays
  const holidays = loadHolidaysForCountry(country); // See below

  // 5. Initialize organization settings
  const settingsCollection = $app.dao().findCollectionByNameOrId("settings");

  // Holidays
  const holidaysSetting = new Record(settingsCollection);
  holidaysSetting.set("organization_id", org.id);
  holidaysSetting.set("key", "holidays");
  holidaysSetting.set("value", holidays);
  $app.dao().saveRecord(holidaysSetting);

  // AppConfig with country defaults
  const defaults = getCountryDefaults(country); // See below
  const config = {
    companyName: orgName,
    currency: defaults.currency,
    timezone: defaults.timezone,
    dateFormat: defaults.dateFormat,
    workingDays: defaults.workingDays,
    // ... other default config values
  };
  const configSetting = new Record(settingsCollection);
  configSetting.set("organization_id", org.id);
  configSetting.set("key", "config");
  configSetting.set("value", config);
  $app.dao().saveRecord(configSetting);

  return c.json(200, { success: true });
});

// Helper function to load country holidays
function loadHolidaysForCountry(countryCode) {
  // You'll need to store holiday JSON files in pb_data or embed them
  const holidayFiles = {
    "BD": [/* BD holidays */],
    "US": [/* US holidays */],
    "IN": [/* IN holidays */],
    "GB": [/* GB holidays */],
    "AE": [/* AE holidays */],
    "SA": [/* SA holidays */],
  };
  return holidayFiles[countryCode] || [];
}

// Helper function to get country defaults
function getCountryDefaults(countryCode) {
  const defaults = {
    "BD": { currency: "BDT", timezone: "Asia/Dhaka", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
    "US": { currency: "USD", timezone: "America/New_York", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "MM/DD/YYYY" },
    "IN": { currency: "INR", timezone: "Asia/Kolkata", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], dateFormat: "DD/MM/YYYY" },
    // ... more countries
  };
  return defaults[countryCode] || { currency: "USD", timezone: "UTC", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" };
}
```

### 3. Update Organization Update Logic

**For changing country/logo/address from admin dashboard:**

The frontend now sends PATCH requests to `/api/collections/organizations/{id}` with FormData containing:
- `country` (string)
- `address` (string)
- `logo` (file, optional)

Ensure the organizations collection API rules allow:
- Admins to update their own organization
- Logo file upload is enabled

**API Rule Example:**
```javascript
// organizations collection - Update rule
@request.auth.id != "" &&
@request.auth.organization_id = id &&
(@request.auth.role = "ADMIN" || @request.auth.role = "SUPER_ADMIN")
```

---

## 🎯 Testing Checklist

### Registration Flow
- [ ] Navigate to registration page
- [ ] Select a country from dropdown (should show flag emoji)
- [ ] Upload a logo (should show preview)
- [ ] Enter address
- [ ] Submit registration
- [ ] Verify organization record has country, logo, and address
- [ ] Verify settings record has holidays matching selected country
- [ ] Verify settings record has currency/timezone matching country

### Admin Dashboard
- [ ] Login as admin
- [ ] Go to Organization > SYSTEM tab
- [ ] Verify current country, logo, and address are displayed
- [ ] Change country to a different one
- [ ] Upload a new logo
- [ ] Update address
- [ ] Click "Save Organization"
- [ ] Verify changes are saved
- [ ] Refresh page and verify data persists

---

## 📋 Future Enhancements (Not Implemented)

### Country Change Merge Strategy
The specification document ([COUNTRY_BASED_HOLIDAYS.md](COUNTRY_BASED_HOLIDAYS.md)) describes a sophisticated merge strategy when changing countries:

**Options:**
1. **Replace All** - Remove existing holidays, load new country's holidays
2. **Merge with Existing** - Keep existing, add new ones (skip duplicates by date)
3. **Keep Current** - Only update country code, don't touch holidays

**Implementation:**
To implement this, you would need to:
1. Add a modal in `OrgSystem.tsx` that appears when country is changed
2. Show the 3 options with counts (e.g., "Remove 9 existing, add 12 new")
3. Call `countryService.mergeHolidays()` or replace based on user choice
4. Update related settings (currency, timezone, working days) with confirmation

This feature is outlined in the spec but not yet implemented to keep the initial implementation simpler.

---

## 📁 Files Modified/Created

### Modified Files
1. ✅ [src/pages/RegisterOrganization.tsx](../src/pages/RegisterOrganization.tsx) - Added country, logo, address fields
2. ✅ [src/services/auth.service.ts](../src/services/auth.service.ts) - Updated to send FormData
3. ✅ [src/components/organization/OrgSystem.tsx](../src/components/organization/OrgSystem.tsx) - Added organization identity section
4. ✅ [src/types.ts](../src/types.ts) - Added RegistrationData interface

### Created Files
5. ✅ [src/services/country.service.ts](../src/services/country.service.ts) - Country-based logic
6. ✅ [src/data/holidays/BD.json](../src/data/holidays/BD.json) - Bangladesh holidays
7. ✅ [src/data/holidays/US.json](../src/data/holidays/US.json) - US holidays
8. ✅ [src/data/holidays/IN.json](../src/data/holidays/IN.json) - India holidays
9. ✅ [src/data/holidays/GB.json](../src/data/holidays/GB.json) - UK holidays
10. ✅ [src/data/holidays/AE.json](../src/data/holidays/AE.json) - UAE holidays
11. ✅ [src/data/holidays/SA.json](../src/data/holidays/SA.json) - Saudi Arabia holidays

### Already Existed (Used)
- [src/data/countries.ts](../src/data/countries.ts) - Country list with codes and flags
- [src/data/countryDefaults.ts](../src/data/countryDefaults.ts) - Currency, timezone, working days per country

---

## 🚀 Deployment Notes

### Frontend
- No build configuration changes needed
- The holiday JSON files will be bundled with Vite automatically
- TypeScript compilation should succeed without errors

### Backend (PocketBase)
1. Update `organizations` collection schema (add fields if missing)
2. Update `/api/openhr/register` endpoint to accept FormData
3. Implement country-based holiday initialization
4. Implement country-based default config initialization
5. Ensure API rules allow admins to update their organization
6. Test file uploads work correctly

### Migration
If you have existing organizations without country:
1. Set default country (e.g., BD) for all existing orgs
2. Optionally prompt admins to update their country on next login

---

## 📚 Related Documentation

- [COUNTRY_BASED_HOLIDAYS.md](COUNTRY_BASED_HOLIDAYS.md) - Original specification (detailed merge strategy)
- [SHOWCASE_ORGANIZATIONS.md](SHOWCASE_ORGANIZATIONS.md) - Organization showcase features

---

**Implementation Date:** February 14, 2026
**Implemented By:** Claude Code
**Status:** ✅ Frontend Complete, ⏳ Backend Integration Required
