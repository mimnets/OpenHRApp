# Backend Changes Summary - Country-Based Registration

## File Updated: `Others/pb_hooks/main.pb.js`

### ✅ What Was Changed

#### 1. Registration Endpoint Updated (Lines ~9-88)
**Previous:** Accepted JSON body with only `orgName`, `adminName`, `email`, `password`
**New:** Accepts FormData with additional fields:
- `country` (required, 2-letter ISO code)
- `address` (optional)
- `logo` (optional file upload)

**Changes Made:**
- ✅ Added support for FormData parsing (handles both JSON and FormData)
- ✅ Extracts `country`, `address` fields from request
- ✅ Handles logo file upload via `requestInfo.files.logo`
- ✅ Saves country and address to organization record
- ✅ Added validation for country code (must be 2 letters)
- ✅ Defaults to 'BD' (Bangladesh) if country not provided

#### 2. Settings Initialization Updated (Lines ~145-170)
**Previous:** Hardcoded Bangladesh settings (BDT currency, Asia/Dhaka timezone, Sun-Thu working days)
**New:** Dynamic country-based settings

**Changes Made:**
- ✅ Calls `getCountryDefaults(country)` to get currency, timezone, working days, date format
- ✅ Calls `loadHolidaysForCountry(country)` to get country-specific holidays
- ✅ Initializes `app_config` with country-specific values
- ✅ Initializes `holidays` setting with country-specific holiday list
- ✅ Added `leave_policy` initialization (was missing before)
- ✅ Expanded departments and designations lists

#### 3. Helper Functions Added (Lines ~1325-1435)
**New Functions:**

**`loadHolidaysForCountry(countryCode)`**
- Returns array of holidays for given country code
- Supports: BD, US, IN, GB, AE, SA
- Returns empty array for countries without predefined holidays

**`getCountryDefaults(countryCode)`**
- Returns object with currency, timezone, workingDays, dateFormat
- Supports 23 countries (BD, US, IN, GB, AE, SA, PK, MY, SG, PH, NG, EG, AU, CA, DE, FR, JP, KR, BR, QA, KW, BH, OM)
- Falls back to USD/UTC defaults for unsupported countries

---

## ✅ What Was NOT Changed (Preserved)

All existing functionality remains intact:
- ✅ Email verification flow unchanged
- ✅ Super admin notifications unchanged
- ✅ Subscription status checks unchanged
- ✅ All other endpoints unchanged (subscription-status, test-email, admin-verify-user, etc.)
- ✅ Leave notifications unchanged
- ✅ Organization update hooks unchanged
- ✅ Blog endpoints unchanged
- ✅ Contact form unchanged
- ✅ Ad config endpoints unchanged
- ✅ Upgrade request processing unchanged

---

## 🔄 Migration Path

### For New Registrations
✅ Works immediately - country, address, and logo will be saved automatically

### For Existing Organizations
Run this migration to add country field to existing organizations:

```javascript
// In PocketBase Admin > API Preview or as a migration script
const orgs = $app.dao().findRecordsByFilter("organizations", "country = ''");
for (const org of orgs) {
  org.set("country", "BD"); // Default to Bangladesh
  $app.dao().saveRecord(org);
}
console.log("Updated", orgs.length, "organizations with default country");
```

---

## 🧪 Testing

### Test New Registration
1. Submit registration form with:
   - orgName: "Test Company"
   - adminName: "Test Admin"
   - email: "test@example.com"
   - password: "password123"
   - country: "US"
   - address: "123 Main St"
   - logo: (upload an image)

2. Verify in PocketBase Admin:
   - Organization record has `country = "US"`, `address = "123 Main St"`, `logo` file
   - Settings record with key `holidays` has 10 US holidays
   - Settings record with key `app_config` has:
     - `currency: "USD"`
     - `timezone: "America/New_York"`
     - `workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"]`
     - `dateFormat: "MM/DD/YYYY"`

### Test Different Countries
Try registering with different country codes:
- BD (Bangladesh) - Should get BDT, Asia/Dhaka, Sun-Thu
- IN (India) - Should get INR, Asia/Kolkata, Mon-Sat
- AE (UAE) - Should get AED, Asia/Dubai, Sun-Thu
- GB (UK) - Should get GBP, Europe/London, Mon-Fri

---

## 📊 Supported Countries

### With Predefined Holidays (6 countries)
| Code | Country | Holidays | Currency | Working Days |
|------|---------|----------|----------|--------------|
| BD | Bangladesh | 8 | BDT | Sun-Thu |
| US | United States | 10 | USD | Mon-Fri |
| IN | India | 8 | INR | Mon-Sat |
| GB | United Kingdom | 8 | GBP | Mon-Fri |
| AE | UAE | 3 | AED | Sun-Thu |
| SA | Saudi Arabia | 2 | SAR | Sun-Thu |

### With Defaults Only (17 countries)
PK, MY, SG, PH, NG, EG, AU, CA, DE, FR, JP, KR, BR, QA, KW, BH, OM

### All Other Countries
Will get:
- Empty holiday list (can be filled manually by admin)
- USD currency, UTC timezone, Mon-Fri working days, DD/MM/YYYY date format

---

## 🚀 Deployment Steps

1. **Stop PocketBase:**
   ```bash
   # Press Ctrl+C to stop
   ```

2. **Replace the hooks file:**
   - Copy `Others/pb_hooks/main.pb.js` to your PocketBase `pb_data/pb_hooks/` directory
   - OR if you already have `pb_data/pb_hooks/main.pb.js`, replace it with the updated version

3. **Ensure organizations schema has required fields:**
   - Open PocketBase Admin UI
   - Go to Collections → organizations
   - Verify these fields exist:
     - `country` (Plain Text, 2 chars, regex: `^[A-Z]{2}$`)
     - `address` (Plain Text or Long Text)
     - `logo` (File, single, 2MB max)
   - If missing, add them (see POCKETBASE_SETUP_GUIDE.md)

4. **Restart PocketBase:**
   ```bash
   ./pocketbase serve
   ```

5. **Check logs:**
   - You should see: `[HOOKS] OpenHR System Hooks loaded successfully with country-based registration support.`

6. **Test registration:**
   - Try registering a new organization
   - Verify country, address, and logo are saved
   - Check that holidays and settings are initialized correctly

---

## ⚠️ Important Notes

- **Backward Compatible:** Existing registrations without country will default to 'BD' (Bangladesh)
- **FormData Support:** The endpoint now accepts both JSON (old) and FormData (new)
- **Non-Breaking:** All existing functionality is preserved
- **Logo Optional:** Logo upload is optional - registration works without it
- **Address Optional:** Address is optional - registration works without it
- **Country Required:** Country is now required (defaults to BD if not provided)

---

## 🐛 Troubleshooting

### "country: cannot be blank"
- ✅ **Fixed** - Country now has default value 'BD' and validation

### Logo upload fails
- Check that `logo` field exists in organizations collection
- Check that it's type `File` with max size at least 2MB
- Check file types allowed: image/png, image/jpeg, image/jpg, image/webp

### Wrong timezone/currency after registration
- Check that the country code is correct (must be 2-letter uppercase, e.g., "US" not "USA")
- Check the console logs to see which country was used
- Verify `getCountryDefaults()` includes your country

### No holidays loaded
- Only 6 countries have predefined holidays (BD, US, IN, GB, AE, SA)
- Other countries will have empty holiday list by design
- Admins can manually add holidays via Organization → HOLIDAYS tab

---

**Updated:** February 14, 2026
**Status:** ✅ Ready for deployment
