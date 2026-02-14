# PocketBase Backend Setup Guide

## Step 1: Update Organizations Collection Schema

Open your PocketBase Admin UI and add these fields to the `organizations` collection:

### Required Fields:

1. **country**
   - Type: `Plain Text`
   - Required: `Yes`
   - Max length: `2`
   - Pattern (Regex): `^[A-Z]{2}$`
   - Note: This enforces 2-letter ISO country codes (BD, US, IN, etc.)

2. **address**
   - Type: `Plain Text` or `Long Text`
   - Required: `No`
   - Max length: `500` (or unlimited for Long Text)

3. **logo**
   - Type: `File`
   - Required: `No`
   - Max select: `1` (single file)
   - Max size: `2097152` (2MB in bytes)
   - Allowed types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

---

## Step 2: Update Existing Organizations (Migration)

If you have existing organizations without the `country` field, run this in PocketBase Admin > API Preview:

```javascript
// Get all organizations
const orgs = $app.dao().findRecordsByFilter("organizations", "country = ''");

// Set default country to Bangladesh for existing orgs
for (const org of orgs) {
  org.set("country", "BD");
  $app.dao().saveRecord(org);
}

console.log("Updated", orgs.length, "organizations with default country BD");
```

---

## Step 3: Update Registration Endpoint

Copy the code from `pb_hooks_registration_example.pb.js` to your PocketBase hooks:

**File location:** `pb_data/pb_hooks/main.pb.js` (or create `registration.pb.js`)

**What it does:**
- Accepts FormData with country, address, logo
- Creates organization with country-specific settings
- Loads holidays based on selected country
- Initializes AppConfig with currency, timezone, working days
- Creates admin user
- Sends verification email

---

## Step 4: Update Organizations Collection API Rules

Ensure admins can update their own organization (for the Dashboard > Organization > System page):

**Collection: organizations**

**Update Rule:**
```javascript
@request.auth.id != "" &&
@request.auth.organization_id = id &&
(@request.auth.role = "ADMIN" || @request.auth.role = "SUPER_ADMIN")
```

**View Rule (if restricted):**
```javascript
@request.auth.organization_id = id
```

---

## Step 5: Restart PocketBase

After making all changes:

```bash
# Stop PocketBase
# Then restart it
./pocketbase serve
```

---

## Step 6: Test Registration

1. Go to your app's registration page
2. Fill in all fields including country, logo, and address
3. Submit the form
4. Check PocketBase Admin UI to verify:
   - Organization was created with country, address, and logo
   - Settings were initialized with country-specific holidays
   - AppConfig has correct currency, timezone, working days
   - Admin user was created

---

## Troubleshooting

### Error: "country: cannot be blank"
- ✅ Fix: Update the registration endpoint to extract `country` from FormData
- The hook code in `pb_hooks_registration_example.pb.js` handles this

### Error: "Failed to load organization data"
- ✅ Fix: Ensure `country`, `address`, and `logo` fields exist in organizations collection
- Check Step 1 above

### Logo upload fails
- ✅ Fix: Ensure `logo` field is type `File` and accepts images
- Check max file size is at least 2MB (2097152 bytes)

### Wrong timezone/currency after registration
- ✅ Fix: Ensure the `getCountryDefaults()` function includes your country
- Add your country to the defaults object in the hook code

---

## Supported Countries (with pre-defined holidays)

- 🇧🇩 Bangladesh (BD)
- 🇺🇸 United States (US)
- 🇮🇳 India (IN)
- 🇬🇧 United Kingdom (GB)
- 🇦🇪 UAE (AE)
- 🇸🇦 Saudi Arabia (SA)

All other countries will get empty holiday list (can be filled manually by admin).

---

## Next Steps

After completing the setup:
1. Test new organization registration
2. Test updating organization details from Dashboard > Organization > System
3. Verify holidays are loaded correctly for each country
4. Add more countries to the holiday data as needed
