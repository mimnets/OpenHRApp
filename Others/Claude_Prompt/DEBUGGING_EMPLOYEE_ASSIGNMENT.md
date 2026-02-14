# Debugging Employee Shift & Team Assignment

## Console Logging Added

I've added comprehensive console logging to track exactly what's happening with shift and team assignments. Here's what you'll see:

### When Opening "Add Employee" Form:
```
[EmployeeDirectory] Opening add employee form
[EmployeeDirectory] Available shifts: 3
[EmployeeDirectory] Default shift found: Day Shift ID: shift_123abc
[EmployeeDirectory] Setting initial form state with shiftId: shift_123abc
```

### When Changing Team Selection:
```
[EmployeeDirectory] Team changed to: team_456def
```

### When Changing Shift Selection:
```
[EmployeeDirectory] Shift changed to: shift_789ghi
```

### When Submitting Form:
```
[EmployeeDirectory] Submitting form with state: {
  name: "John Doe",
  teamId: "team_456def",
  shiftId: "shift_789ghi",
  isEdit: false
}
[EmployeeDirectory] Creating new employee
[EmployeeService] Creating employee with data: {
  name: "John Doe",
  email: "john@example.com",
  role: "EMPLOYEE",
  employee_id: "EMP-001",
  team_id: "team_456def",      ← Should have value
  shift_id: "shift_789ghi",     ← Should have value
  organization_id: "..."
}
[EmployeeService] Original input: {
  teamId: "team_456def",
  shiftId: "shift_789ghi"
}
```

---

## Debugging Steps

### Step 1: Check Default Shift Selection

1. **Open Employee Directory** as Admin
2. **Click "Provision New User"**
3. **Open Browser Console** (F12)
4. **Look for these logs:**
   - `Available shifts:` → Should show number of shifts configured
   - `Default shift found:` → Should show shift name and ID
   - `Setting initial form state with shiftId:` → Should NOT be empty

**Problem Indicators:**
- ❌ `Available shifts: 0` → No shifts configured in system
- ❌ `Default shift found: undefined ID: undefined` → No shift marked as default
- ✅ `Default shift found: Day Shift ID: shift_abc123` → Correct!

**Solution if no default shift:**
- Go to Organization → SHIFTS
- Create or edit a shift
- Check "Set as Default Shift"

### Step 2: Check Shift Dropdown Display

1. **Look at the shift dropdown** in the form
2. **Verify:**
   - Dropdown shows list of shifts
   - Default shift should be PRE-SELECTED
   - Shows "(Start-End)" time for each shift
   - Default shift has asterisk `*` after time

**Problem Indicators:**
- ❌ Dropdown shows "No Shift Assigned" even though default exists
- ❌ Dropdown is empty
- ✅ Dropdown shows shift name with time, and it's selected

### Step 3: Track Form Changes

1. **Change the team dropdown**
2. **Check console:** Should see `[EmployeeDirectory] Team changed to: team_id`
3. **Change the shift dropdown**
4. **Check console:** Should see `[EmployeeDirectory] Shift changed to: shift_id`

**Problem Indicators:**
- ❌ No console log when changing dropdown → Event handler not firing
- ❌ Console shows empty string → Selected "No Team/Shift Assigned"
- ✅ Console shows actual ID → Working correctly

### Step 4: Verify Submission Data

1. **Fill in all employee details**
2. **Select team and shift** (or leave defaults)
3. **Click "Provision User"**
4. **Check console for:**
   ```
   [EmployeeDirectory] Submitting form with state: { teamId: "...", shiftId: "..." }
   [EmployeeService] Creating employee with data: { team_id: "...", shift_id: "..." }
   ```

**Problem Indicators:**
- ❌ `teamId: ""` or `shiftId: ""` in submission → Form state lost
- ❌ `team_id: null` in processed data → Being converted to null incorrectly
- ✅ Both have actual IDs → Working correctly!

### Step 5: Verify Database Save

1. **After employee created successfully**
2. **Go to PocketBase Admin** (http://localhost:8090/_/)
3. **Navigate to Collections → users**
4. **Find the newly created employee**
5. **Check fields:**
   - `team_id` → Should have the team ID you selected
   - `shift_id` → Should have the shift ID you selected

**Problem Indicators:**
- ❌ Fields are empty or null → Not being saved to database
- ❌ Fields exist but wrong value → Data transformation issue
- ✅ Fields have correct IDs → Saved correctly!

### Step 6: Verify Display After Creation

1. **Refresh Employee Directory**
2. **Click on the newly created employee**
3. **View modal should show:**
   - Team Name: (actual team name)
   - Assigned Shift: (shift name with time)

**Problem Indicators:**
- ❌ Shows "No Team" or "No Shift Assigned" → Data not loaded from DB
- ❌ Shows "Unknown Team/Shift" → ID exists but doesn't match loaded teams/shifts
- ✅ Shows actual names → Everything working!

---

## Common Issues & Solutions

### Issue 1: No Default Shift Set

**Symptoms:**
- Console shows: `Default shift found: undefined`
- Shift dropdown shows "No Shift Assigned" when form opens

**Solution:**
1. Go to **Organization → SHIFTS**
2. Click on a shift to edit OR create new shift
3. **Check the box:** "Set as Default Shift"
4. Save
5. Try adding employee again

### Issue 2: Shifts Not Loading

**Symptoms:**
- Console shows: `Available shifts: 0`
- Shift section doesn't appear in form

**Solution:**
1. Go to **Organization → SHIFTS**
2. Create at least one shift
3. Mark one as default
4. Refresh Employee Directory page
5. Try adding employee again

### Issue 3: Form State Reset on Change

**Symptoms:**
- Select a team → works
- Select a shift → team selection disappears

**Solution:**
This is a React state management issue. The code uses:
```javascript
setFormState({...formState, teamId: e.target.value})
```
This should work correctly. If it doesn't, check for:
- Multiple re-renders
- Form state being reset elsewhere
- Browser console errors

### Issue 4: Data Saved but Not Displayed

**Symptoms:**
- PocketBase shows correct team_id and shift_id
- But Employee Directory shows "No Team" or "No Shift"

**Solution:**
1. Check if teams/shifts are loaded in EmployeeDirectory
2. Console should show: `Fetched X employees`
3. Verify `teams` and `shifts` state arrays are populated
4. Check the `getTeamName()` and `getShiftName()` functions

### Issue 5: Empty String vs Null Confusion

**Symptoms:**
- Sometimes saves, sometimes doesn't
- Inconsistent behavior

**Explanation:**
- `""` (empty string) = No assignment selected from dropdown
- `null` = Database value for "no assignment"
- `"shift_123"` = Actual assignment

The code should convert `""` → `null` before saving.

**Verification:**
Check console log: `Processed data:` should show `null` for empty strings.

---

## Files Modified for Debugging

### 1. `src/services/employee.service.ts`
- **Lines 87-88:** Added logging for employee creation
- **Lines 102-104:** Added logging for employee update
- **Lines 110-113:** Added result logging

### 2. `src/pages/EmployeeDirectory.tsx`
- **Lines 182-194:** Added logging when opening add form
- **Lines 238-260:** Added logging for form submission
- **Lines 528-540:** Added logging for team dropdown change
- **Lines 542-556:** Added logging for shift dropdown change

---

## If Issues Persist

If you're still experiencing issues after checking all the above:

### 1. Clear Browser Cache
```
1. Press Ctrl+Shift+Delete
2. Clear cache and cookies
3. Refresh page (Ctrl+F5)
```

### 2. Check PocketBase Schema
```
1. Open PocketBase Admin
2. Go to Collections → users
3. Verify these fields exist:
   - team_id (Relation to teams)
   - shift_id (Relation to shifts)
   - line_manager_id (Relation to users)
```

### 3. Restart Dev Server
```bash
# Frontend
npm run dev

# Backend (PocketBase)
./pocketbase serve
```

### 4. Check for TypeScript Errors
```bash
npm run build
```
Look for any compilation errors related to Employee types.

### 5. Verify PocketBase API Rules
```
Collection: users

Create Rule:
  @request.auth.organization_id = organization_id &&
  (@request.auth.role = "ADMIN" || @request.auth.role = "HR")

Update Rule:
  @request.auth.organization_id = organization_id &&
  (@request.auth.role = "ADMIN" || @request.auth.role = "HR" || @request.auth.id = id)
```

---

## Expected Console Output (Full Flow)

```
[EmployeeDirectory] Opening add employee form
[EmployeeDirectory] Available shifts: 2
[EmployeeDirectory] Default shift found: Day Shift ID: shift_abc123
[EmployeeDirectory] Setting initial form state with shiftId: shift_abc123

--- User fills form and changes team ---
[EmployeeDirectory] Team changed to: team_456def

--- User clicks submit ---
[EmployeeDirectory] Submitting form with state: {
  name: "John Doe",
  teamId: "team_456def",
  shiftId: "shift_abc123",
  isEdit: false
}
[EmployeeDirectory] Creating new employee
[EmployeeService] Creating employee with data: {
  name: "John Doe",
  email: "john@example.com",
  role: "EMPLOYEE",
  employee_id: "EMP-001",
  department: "Engineering",
  designation: "Developer",
  team_id: "team_456def",
  shift_id: "shift_abc123",
  organization_id: "org_xyz789",
  emailVisibility: true,
  username: "user_emp_001"
}
[EmployeeService] Original input: {
  teamId: "team_456def",
  shiftId: "shift_abc123"
}
[EmployeeService] Fetched 5 employees
```

---

## Next Steps

1. **Try creating an employee** and watch the console
2. **Copy the console output** if you see issues
3. **Share the console logs** to help diagnose the problem
4. **Check PocketBase Admin** to verify data was saved

The comprehensive logging will help identify exactly where the issue is occurring!
