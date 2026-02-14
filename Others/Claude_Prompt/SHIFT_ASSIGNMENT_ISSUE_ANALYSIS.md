# Shift Assignment Issue - Root Cause Analysis & Solutions

## ❌ Current Problem

**Symptom:** Shifts are not being assigned to employees even after:
- ✅ Code fixes implemented
- ✅ Console logging added
- ✅ Default shift selection working in form
- ✅ Data being sent to backend

**Root Cause:** Architecture mismatch between how shifts are stored and how they're referenced.

---

## 🔍 Current Architecture Analysis

### How Shifts Are Currently Stored
```
Collection: settings
├── Record 1: key = "shifts", value = [
│   { id: "shift_123", name: "Day Shift", startTime: "09:00", ... },
│   { id: "shift_456", name: "Night Shift", startTime: "21:00", ... }
│   ]
```

### How Shifts Are Referenced
```
Collection: users
├── User 1: { name: "John", shift_id: "shift_123" }  ← Plain text field
```

### The Problem
PocketBase has TWO types of fields for references:
1. **Relation Field:** Links to actual records in another collection
2. **Plain Text Field:** Just stores text (like an ID)

**Current Issue:** If `shift_id` in the users collection is configured as a **Relation** field, it will FAIL because:
- PocketBase expects shift_id to point to a record in a "shifts" collection
- But shifts are stored as JSON in the "settings" collection
- PocketBase can't find a "shifts" collection, so it rejects the value

**Solution:** `shift_id` must be a **Plain Text** field, not a Relation field.

---

## ✅ Recommended Solutions

### Option 1: Keep Current Architecture (Quick Fix)

**Steps:**
1. Open PocketBase Admin UI (http://localhost:8090/_/)
2. Go to Collections → users
3. Find the `shift_id` field
4. **Change type to:** `Plain Text`
5. **Max length:** 50
6. **Required:** No
7. Save schema

**Pros:**
- ✅ Quick fix (5 minutes)
- ✅ No code changes needed
- ✅ Existing data structure preserved

**Cons:**
- ❌ No referential integrity (can set invalid shift IDs)
- ❌ No cascade delete (if shift deleted, orphaned references remain)
- ❌ Manual validation needed in code

---

### Option 2: Create Separate Shifts Collection (Recommended)

**Why This Is Better:**
- ✅ Proper referential integrity
- ✅ PocketBase relation fields work correctly
- ✅ Easier to query and filter
- ✅ Better performance
- ✅ Proper database normalization
- ✅ Can use PocketBase expand feature

**Migration Steps:**

#### Step 1: Create Shifts Collection
```javascript
// In PocketBase Admin UI → Collections → Create Collection

Collection Name: shifts
Type: Base Collection

Fields:
├── name (Plain Text, required)
├── startTime (Plain Text, required)
├── endTime (Plain Text, required)
├── lateGracePeriod (Number, default: 15)
├── earlyOutGracePeriod (Number, default: 15)
├── earliestCheckIn (Plain Text, default: "06:00")
├── autoSessionCloseTime (Plain Text, default: "23:59")
├── workingDays (JSON, required)
├── isDefault (Boolean, default: false)
└── organization_id (Relation to organizations, required)

API Rules:
├── List: @request.auth.organization_id = organization_id
├── View: @request.auth.organization_id = organization_id
├── Create: @request.auth.role = "ADMIN" || @request.auth.role = "HR"
├── Update: @request.auth.role = "ADMIN" || @request.auth.role = "HR"
└── Delete: @request.auth.role = "ADMIN"
```

#### Step 2: Migrate Existing Shifts
```javascript
// Run in PocketBase Admin → API Preview

// 1. Get all organizations with shifts
const orgs = $app.dao().findRecordsByFilter("settings", "key = 'shifts'");

for (let i = 0; i < orgs.length; i++) {
  const setting = orgs[i];
  const orgId = setting.getString("organization_id");
  const shiftsData = setting.get("value"); // Array of shift objects

  if (!shiftsData || shiftsData.length === 0) continue;

  // 2. Create shift records
  const shiftsCollection = $app.dao().findCollectionByNameOrId("shifts");

  for (let j = 0; j < shiftsData.length; j++) {
    const shiftData = shiftsData[j];

    const shift = new Record(shiftsCollection);
    shift.set("name", shiftData.name);
    shift.set("startTime", shiftData.startTime);
    shift.set("endTime", shiftData.endTime);
    shift.set("lateGracePeriod", shiftData.lateGracePeriod || 15);
    shift.set("earlyOutGracePeriod", shiftData.earlyOutGracePeriod || 15);
    shift.set("earliestCheckIn", shiftData.earliestCheckIn || "06:00");
    shift.set("autoSessionCloseTime", shiftData.autoSessionCloseTime || "23:59");
    shift.set("workingDays", shiftData.workingDays);
    shift.set("isDefault", shiftData.isDefault || false);
    shift.set("organization_id", orgId);

    $app.dao().saveRecord(shift);

    console.log("Migrated shift:", shiftData.name, "for org:", orgId);
  }
}

console.log("Shift migration completed!");
```

#### Step 3: Update Users Collection Schema
```javascript
// In PocketBase Admin UI → Collections → users

// Update shift_id field:
Type: Relation
Related Collection: shifts
Max Select: 1 (Single)
Required: No
Display Fields: name, startTime, endTime
```

#### Step 4: Update Frontend Code

**File: `src/services/shift.service.ts`**
```typescript
// BEFORE (current - using settings)
async getShifts(): Promise<Shift[]> {
  const setting = await apiClient.pb.collection('settings')
    .getFirstListItem(`key="shifts" && organization_id="${orgId}"`);
  return setting.value || [];
}

// AFTER (new - using shifts collection)
async getShifts(): Promise<Shift[]> {
  if (!apiClient.pb || !apiClient.isConfigured()) return [];

  try {
    const records = await apiClient.pb.collection('shifts').getFullList({
      sort: '-created',
      filter: `organization_id="${apiClient.getOrganizationId()}"`
    });

    return records.map(r => ({
      id: r.id,
      name: r.name,
      startTime: r.startTime,
      endTime: r.endTime,
      lateGracePeriod: r.lateGracePeriod,
      earlyOutGracePeriod: r.earlyOutGracePeriod,
      earliestCheckIn: r.earliestCheckIn,
      autoSessionCloseTime: r.autoSessionCloseTime,
      workingDays: r.workingDays,
      isDefault: r.isDefault
    }));
  } catch (e) {
    console.error("[ShiftService] Failed to fetch shifts:", e);
    return [];
  }
}

async setShifts(shifts: Shift[]): Promise<void> {
  // No longer needed - shifts are managed individually through CRUD operations
}

async createShift(shift: Partial<Shift>): Promise<void> {
  if (!apiClient.pb || !apiClient.isConfigured()) return;

  const pbData = {
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    lateGracePeriod: shift.lateGracePeriod || 15,
    earlyOutGracePeriod: shift.earlyOutGracePeriod || 15,
    earliestCheckIn: shift.earliestCheckIn || "06:00",
    autoSessionCloseTime: shift.autoSessionCloseTime || "23:59",
    workingDays: shift.workingDays,
    isDefault: shift.isDefault || false,
    organization_id: apiClient.getOrganizationId()
  };

  await apiClient.pb.collection('shifts').create(pbData);
  apiClient.notify();
}

async updateShift(id: string, shift: Partial<Shift>): Promise<void> {
  if (!apiClient.pb || !apiClient.isConfigured()) return;
  await apiClient.pb.collection('shifts').update(id, shift);
  apiClient.notify();
}

async deleteShift(id: string): Promise<void> {
  if (!apiClient.pb || !apiClient.isConfigured()) return;
  await apiClient.pb.collection('shifts').delete(id);
  apiClient.notify();
}
```

#### Step 5: Update Organization Shifts Tab

**File: `src/components/organization/OrgShifts.tsx`**
```typescript
// Change from array-based management to CRUD operations

// BEFORE
const handleSaveShift = async () => {
  const updatedShifts = [...shifts];
  if (editIndex !== null) {
    updatedShifts[editIndex] = shiftForm;
  } else {
    updatedShifts.push({ ...shiftForm, id: 'shift_' + Date.now() });
  }
  await updateShifts(updatedShifts);
};

// AFTER
const handleSaveShift = async () => {
  if (editIndex !== null) {
    await hrService.updateShift(shifts[editIndex].id, shiftForm);
  } else {
    await hrService.createShift(shiftForm);
  }
};

const handleDeleteShift = async (index: number) => {
  await hrService.deleteShift(shifts[index].id);
};
```

---

## 🎯 Quick Fix vs Long-Term Solution

### For Immediate Testing (5 minutes)

**Use Option 1:** Change `shift_id` to Plain Text field
1. PocketBase Admin → Collections → users
2. Edit `shift_id` field → Change to "Plain Text"
3. Test employee creation
4. Should work immediately!

### For Production (Recommended)

**Use Option 2:** Migrate to separate shifts collection
- Better database design
- Proper relations
- Easier to maintain
- Scalable architecture

---

## 🔍 How to Verify the Issue

### Check PocketBase Schema

1. **Open PocketBase Admin:** http://localhost:8090/_/
2. **Go to:** Collections → users
3. **Find:** `shift_id` field
4. **Check the type:**
   - ❌ If it says "Relation" → This is the problem!
   - ✅ If it says "Plain Text" → Schema is correct

### Check Console Logs

When creating employee, look for:
```
[EmployeeService] Creating employee with data: {
  shift_id: "shift_abc123"  ← Should have a value
}
```

Then check PocketBase response:
```
[EmployeeService] Result: {
  id: "user_xyz",
  shift_id: ""  ← Empty? Field rejected!
}
```

If `shift_id` is empty in response but was sent in request, the PocketBase schema is rejecting it.

---

## 📊 Comparison Table

| Aspect | Current (Settings) | Separate Collection |
|--------|-------------------|---------------------|
| Schema Complexity | Low | Medium |
| Referential Integrity | ❌ No | ✅ Yes |
| PocketBase Relations | ❌ Can't use | ✅ Can use |
| Query Performance | ❌ Slower | ✅ Faster |
| Data Validation | ❌ Manual | ✅ Automatic |
| Cascade Delete | ❌ No | ✅ Yes |
| API Rules | ❌ Complex | ✅ Simple |
| Migration Effort | ✅ None | ⚠️ 2-3 hours |
| Future Scalability | ❌ Limited | ✅ Excellent |

---

## 🚀 Recommendation

### Immediate Action (Today)
**Fix the schema issue:**
1. Change `shift_id` field to "Plain Text" in users collection
2. Test employee creation
3. Verify shift is saved

### Future Action (This Week)
**Migrate to proper architecture:**
1. Create shifts collection
2. Migrate existing data
3. Update frontend code
4. Test thoroughly
5. Deploy

---

## 📝 Testing Checklist

After fixing the schema:

- [ ] Create employee with shift selected
- [ ] Check PocketBase Admin → users → verify shift_id has value
- [ ] View employee in directory → should show shift
- [ ] Update employee shift → should save
- [ ] Remove employee shift → should clear
- [ ] Check console logs → should show shift_id in response

---

## 🎓 Key Learnings

1. **PocketBase Relation fields** only work with actual collections
2. **JSON data in settings** can't be referenced with Relation fields
3. **Plain Text fields** work for storing IDs as strings
4. **Separate collections** provide better architecture for relational data
5. **Migration effort** is worth it for long-term maintainability

---

**Next Step:** Check your PocketBase schema for the `shift_id` field type!

If it's a Relation field, that's the issue. Change it to Plain Text and test again.
