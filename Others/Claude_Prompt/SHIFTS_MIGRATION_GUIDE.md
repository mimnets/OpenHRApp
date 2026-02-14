# Complete Shift Migration Guide
## From Settings-based Storage to Dedicated Shifts Collection

---

## 📋 Overview

This guide will help you migrate from storing shifts in the `settings` collection to using a dedicated `shifts` collection. This solves the shift assignment issue and provides better database architecture.

**Estimated Time:** 1-2 hours
**Difficulty:** Medium
**Rollback:** Possible (backup required)

---

## 🎯 Why This Migration?

### Current Problem
- Shifts stored as JSON in `settings` collection
- `shift_id` field in users collection is configured as **Relation** field
- PocketBase expects `shift_id` to point to actual records in a "shifts" collection
- Since shifts are in settings (as JSON), PocketBase rejects the values
- **Result:** Shifts cannot be assigned to employees

### After Migration
✅ Proper database normalization
✅ Referential integrity
✅ PocketBase Relation fields work correctly
✅ Better query performance
✅ Easier to maintain and scale

---

## ⚠️ Prerequisites

### 1. Backup Your Database
```bash
# Stop PocketBase
# Copy the pb_data folder
cp -r pb_data pb_data_backup_$(date +%Y%m%d)
```

### 2. Required Access
- PocketBase Admin access (http://localhost:8090/_/)
- Code editor access
- Terminal/command line access

### 3. System Check
- [ ] PocketBase running and accessible
- [ ] No active users in the system (to avoid data conflicts)
- [ ] All shifts data is visible in Organization → SHIFTS tab

---

## 📝 Migration Steps

## Step 1: Create Shifts Collection Schema

### 1.1 Open PocketBase Admin
- Navigate to: http://localhost:8090/_/
- Go to: **Collections** → **Create Collection**

### 1.2 Collection Settings
```
Collection Name: shifts
Collection Type: Base Collection
```

### 1.3 Add Fields

Click **Add Field** for each field below:

#### Field 1: name
```
Type: Plain text
Required: ✓ Yes
Max length: 100
Presentable: ✓ Yes (check this box)
```

#### Field 2: startTime
```
Type: Plain text
Required: ✓ Yes
Max length: 5
Pattern: ^([01]?[0-9]|2[0-3]):[0-5][0-9]$
```

#### Field 3: endTime
```
Type: Plain text
Required: ✓ Yes
Max length: 5
Pattern: ^([01]?[0-9]|2[0-3]):[0-5][0-9]$
```

#### Field 4: lateGracePeriod
```
Type: Number
Required: ✓ Yes
Default: 15
Min: 0
Max: 120
```

#### Field 5: earlyOutGracePeriod
```
Type: Number
Required: ✓ Yes
Default: 15
Min: 0
Max: 120
```

#### Field 6: earliestCheckIn
```
Type: Plain text
Required: ✓ Yes
Default: "06:00"
Max length: 5
```

#### Field 7: autoSessionCloseTime
```
Type: Plain text
Required: ✓ Yes
Default: "23:59"
Max length: 5
```

#### Field 8: workingDays
```
Type: JSON
Required: ✓ Yes
Default: ["Monday","Tuesday","Wednesday","Thursday","Sunday"]
```

#### Field 9: isDefault
```
Type: Boolean
Required: No
Default: false
```

#### Field 10: organization_id
```
Type: Relation
Required: ✓ Yes
Related Collection: organizations
Max Select: 1 (Single)
Cascade Delete: ✓ Yes
Display Fields: name
```

### 1.4 Configure API Rules

Click on **API Rules** tab:

```javascript
// List Rule
@request.auth.organization_id = organization_id

// View Rule
@request.auth.organization_id = organization_id

// Create Rule
(@request.auth.role = "ADMIN" || @request.auth.role = "HR") &&
@request.auth.organization_id = organization_id

// Update Rule
(@request.auth.role = "ADMIN" || @request.auth.role = "HR") &&
@request.auth.organization_id = organization_id

// Delete Rule
@request.auth.role = "ADMIN" &&
@request.auth.organization_id = organization_id
```

### 1.5 Save Collection
Click **Save** to create the shifts collection.

---

## Step 2: Run Data Migration Script

### 2.1 Open PocketBase API Preview
- PocketBase Admin → **Settings** (⚙️ icon) → **API Preview**

### 2.2 Execute Migration Script
- Open file: `Others/Claude_Prompt/SHIFTS_MIGRATION_SCRIPT.js`
- Copy the entire contents
- Paste into the API Preview text area
- Click **Execute**

### 2.3 Verify Migration Output
You should see output like:
```
=== Starting Shifts Migration ===
Found 1 organizations with shifts to migrate

Processing organization: abc123xyz
  Shifts to migrate: 2
  ✓ Migrated: "Day Shift" (shift_1234567890 → NEW_ID_HERE)
  ✓ Migrated: "Night Shift" (shift_9876543210 → NEW_ID_HERE)

=== Updating User References ===
Found 5 users with shift assignments
  ✓ Updated user John Doe: shift_1234567890 → NEW_ID_HERE
  ...

=== Migration Summary ===
Total shifts migrated: 2
Errors encountered: 0
```

### 2.4 Verify in PocketBase Admin
- Go to: **Collections** → **shifts**
- You should see all your migrated shifts
- Go to: **Collections** → **users**
- Open a user with a shift
- Check that `shift_id` field shows the new shift ID

---

## Step 3: Update Users Collection Schema

### 3.1 Open Users Collection
- PocketBase Admin → **Collections** → **users**

### 3.2 Update shift_id Field
- Find the `shift_id` field
- Click **Edit**
- Change settings to:
```
Type: Relation
Related Collection: shifts
Max Select: 1 (Single)
Required: No
Display Fields: name, startTime, endTime
Cascade Delete: No (Set null)
```
- Click **Save**

### 3.3 Verify
- The field should now show as a **Relation** field
- It should link to the **shifts** collection

---

## Step 4: Update Frontend Code

### 4.1 Update shift.service.ts

**Backup current file:**
```bash
cp src/services/shift.service.ts src/services/shift.service.ts.backup
```

**Replace with new version:**
```bash
cp Others/Claude_Prompt/shift.service.NEW.ts src/services/shift.service.ts
```

### 4.2 Update hrService.ts

Open `src/services/hrService.ts` and add these methods:

```typescript
// Find the hrService export (around line 30-70)
export const hrService = {
  // ... existing methods ...

  // ADD these new methods:
  createShift: shiftService.createShift.bind(shiftService),
  updateShift: shiftService.updateShift.bind(shiftService),
  deleteShift: shiftService.deleteShift.bind(shiftService),

  // KEEP this for loading:
  getShifts: shiftService.getShifts.bind(shiftService),

  // REMOVE or comment out:
  // setShifts: shiftService.setShifts.bind(shiftService),
};
```

### 4.3 Update useOrganization.ts

Open `src/hooks/organization/useOrganization.ts`:

**Remove these lines** (around line 166-171):
```typescript
const updateShifts = async (newShifts: Shift[]) => {
  setIsSaving(true);
  await hrService.setShifts(newShifts);
  setShifts(newShifts);
  setIsSaving(false);
};
```

**Update the return statement** (around line 180-185):
```typescript
return {
  departments, designations, holidays, teams, config, workflows, employees, leavePolicy,
  // REMOVE: shifts, // We'll manage this locally in Organization.tsx now
  shiftOverrides,
  isLoading, isSaving,
  saveConfig, updateDepartments, updateDesignations, updateHolidays, saveTeam, deleteTeam,
  updateLeavePolicy, updateWorkflows,
  // REMOVE: updateShifts, // No longer needed
  updateShiftOverrides
};
```

### 4.4 Update Organization.tsx

See detailed changes in: `Others/Claude_Prompt/ORGANIZATION_SHIFTS_UPDATED_CODE.tsx`

**Key changes:**

1. Add local state for shifts (top of component):
```typescript
const [shifts, setShifts] = useState<Shift[]>([]);
```

2. Load shifts separately:
```typescript
useEffect(() => {
  const loadShifts = async () => {
    const shiftsData = await hrService.getShifts();
    setShifts(shiftsData);
  };
  loadShifts();
}, []);
```

3. Update shift save handler (around line 122):
```typescript
} else if (modalType === 'SHIFT') {
  if (editIndex !== null) {
    const shiftId = shifts[editIndex].id;
    await hrService.updateShift(shiftId, shiftForm);
  } else {
    await hrService.createShift(shiftForm);
  }
  const updatedShifts = await hrService.getShifts();
  setShifts(updatedShifts);
}
```

4. Update shift delete handler (around line 161):
```typescript
} else if (type === 'SHIFT' as any) {
  const shiftId = shifts[index].id;
  await hrService.deleteShift(shiftId);
  const updatedShifts = await hrService.getShifts();
  setShifts(updatedShifts);
}
```

---

## Step 5: Test the Migration

### 5.1 Start Application
```bash
npm run dev
```

### 5.2 Test Shift Management

#### Test 1: View Shifts
- [ ] Login as Admin
- [ ] Go to Organization → SHIFTS
- [ ] Verify all shifts are visible
- [ ] Check that default shift is marked

#### Test 2: Create New Shift
- [ ] Click "+" button
- [ ] Fill in shift details
- [ ] Save
- [ ] Verify shift appears in list

#### Test 3: Edit Shift
- [ ] Click Edit icon on a shift
- [ ] Modify details
- [ ] Save
- [ ] Verify changes are reflected

#### Test 4: Delete Shift
- [ ] Click Delete icon on a non-default shift
- [ ] Confirm deletion
- [ ] Verify shift is removed

#### Test 5: Assign Shift to Employee
- [ ] Go to Employee Directory
- [ ] Click "Add Employee" or edit existing
- [ ] Select a shift from dropdown
- [ ] Save employee
- [ ] **CRITICAL:** Open browser console
- [ ] Verify no errors
- [ ] Go to PocketBase Admin → users
- [ ] Find the employee record
- [ ] **Check that shift_id field has a value** ✅

#### Test 6: View Employee Shift
- [ ] Go to Employee Directory
- [ ] Click on employee with shift
- [ ] Verify shift is displayed (e.g., "Day Shift (09:00-18:00)")

#### Test 7: Change Employee Shift
- [ ] Edit employee
- [ ] Change shift to different one
- [ ] Save
- [ ] Verify new shift is displayed

#### Test 8: Remove Employee Shift
- [ ] Edit employee
- [ ] Select "No Shift Assigned" (empty option)
- [ ] Save
- [ ] Verify shift is cleared

### 5.3 Console Checks

Open browser console (F12) and look for:

✅ **Good logs:**
```
[ShiftService] Fetching shifts from collection
[ShiftService] Fetched 2 shifts
[EmployeeService] Creating employee with data: { shift_id: "abc123..." }
```

❌ **Bad logs (should NOT appear):**
```
Failed to fetch shifts
shift_id cannot be blank
relation not found
```

---

## Step 6: Cleanup (Optional)

### 6.1 Remove Old Shift Data from Settings

**Only do this after verifying everything works!**

In PocketBase Admin → API Preview:
```javascript
// Delete old settings records with key='shifts'
const oldRecords = $app.dao().findRecordsByFilter("settings", "key = 'shifts'");
for (let i = 0; i < oldRecords.length; i++) {
  $app.dao().deleteRecord(oldRecords[i]);
}
console.log(`Deleted ${oldRecords.length} old shift settings records`);
```

### 6.2 Remove Backup Files (After 1 Week)
```bash
# Only if everything is working perfectly
rm src/services/shift.service.ts.backup
rm -r pb_data_backup_*
```

---

## 🔧 Troubleshooting

### Problem: Migration script fails

**Solution:**
- Check console output for specific error
- Verify shifts collection exists
- Ensure you have admin access
- Check PocketBase logs: `pb_data/logs/`

### Problem: Shifts not showing after migration

**Solution:**
1. Check browser console for errors
2. Verify API rules in shifts collection
3. Check organization_id filter is correct
4. Try: `hrService.getShifts()` in browser console

### Problem: Shift assignment still not working

**Solution:**
1. Verify `shift_id` field in users collection is **Relation** type
2. Check it points to **shifts** collection
3. Verify frontend code is updated (step 4)
4. Check browser console for errors
5. Inspect PocketBase error logs

### Problem: "Relation not found" error

**Solution:**
- Clear browser cache
- Reload page
- Verify migration script completed successfully
- Check shift IDs in users collection match IDs in shifts collection

### Problem: Default shift not working

**Solution:**
```javascript
// In PocketBase Admin → API Preview
// Ensure one shift is default
const shifts = $app.dao().findRecordsByExpr("shifts");
if (shifts.length > 0) {
  shifts[0].set("isDefault", true);
  $app.dao().saveRecord(shifts[0]);
}
```

---

## 📊 Verification Checklist

After migration, verify:

- [ ] Shifts collection exists with all fields
- [ ] Old shifts data migrated to new collection
- [ ] User shift_id references updated to new IDs
- [ ] shift_id field is Relation type pointing to shifts collection
- [ ] Frontend code updated (shift.service.ts, hrService.ts, Organization.tsx)
- [ ] Can view shifts in Organization → SHIFTS
- [ ] Can create new shift
- [ ] Can edit existing shift
- [ ] Can delete shift
- [ ] Can assign shift to employee during provisioning
- [ ] Shift shows in employee view
- [ ] Can change employee shift
- [ ] Can remove employee shift
- [ ] Default shift logic works
- [ ] No console errors

---

## 🎓 Understanding the New Architecture

### Before (Settings-based)
```
settings collection:
  - Record { key: "shifts", value: [array of shift objects] }

users collection:
  - shift_id: "shift_1234567890" (plain text, no validation)
```

**Problems:**
- No referential integrity
- No cascade handling
- Can't use PocketBase Relation features
- Manual validation required

### After (Dedicated Collection)
```
shifts collection:
  - Record { id: "abc123", name: "Day Shift", ... }
  - Record { id: "def456", name: "Night Shift", ... }

users collection:
  - shift_id: "abc123" (Relation to shifts.id)
```

**Benefits:**
- ✅ Referential integrity enforced
- ✅ Cascade options available
- ✅ Can use expand feature
- ✅ Better queries and filters
- ✅ Proper normalization

---

## 📚 Related Documentation

- [SHIFT_ASSIGNMENT_ISSUE_ANALYSIS.md](./SHIFT_ASSIGNMENT_ISSUE_ANALYSIS.md) - Root cause analysis
- [SHIFTS_MIGRATION_SCRIPT.js](./SHIFTS_MIGRATION_SCRIPT.js) - Migration script
- [shift.service.NEW.ts](./shift.service.NEW.ts) - Updated service
- [ORGANIZATION_SHIFTS_UPDATED_CODE.tsx](./ORGANIZATION_SHIFTS_UPDATED_CODE.tsx) - UI updates

---

## 🆘 Need Help?

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review browser console errors
3. Check PocketBase logs: `pb_data/logs/`
4. Verify each step was completed
5. Restore from backup and try again

---

## ✅ Success Criteria

Migration is successful when:

1. ✅ You can create, edit, delete shifts in Organization → SHIFTS
2. ✅ You can assign a shift to a new employee
3. ✅ The shift saves and shows in employee view
4. ✅ PocketBase Admin shows shift_id with a value (not empty)
5. ✅ No console errors appear
6. ✅ All tests in Step 5 pass

---

**Good luck with your migration! 🚀**
