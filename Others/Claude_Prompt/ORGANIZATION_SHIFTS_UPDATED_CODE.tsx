/**
 * UPDATED Organization.tsx - Shift Management Section
 *
 * This file contains the UPDATED code for managing shifts in Organization.tsx
 * after migrating to the dedicated shifts collection.
 *
 * CHANGES:
 * - Replace array-based management with individual CRUD operations
 * - Remove setShifts() calls, use createShift/updateShift/deleteShift instead
 * - Update state management to refresh from server after mutations
 *
 * INSTRUCTIONS:
 * 1. Locate these sections in your Organization.tsx
 * 2. Replace with the code below
 * 3. Update the useOrganization hook (see below)
 */

// ============================================================================
// SECTION 1: Update the handleModalSubmit function (SHIFT case)
// ============================================================================
// Find this section around line 122-133 in Organization.tsx
// Replace the SHIFT case with:

} else if (modalType === 'SHIFT') {
  // NEW APPROACH: Use individual create/update operations
  if (editIndex !== null) {
    // Update existing shift
    const shiftId = shifts[editIndex].id;
    await hrService.updateShift(shiftId, shiftForm);
  } else {
    // Create new shift
    await hrService.createShift(shiftForm);
  }

  // Reload shifts from server to get updated data
  const updatedShifts = await hrService.getShifts();
  setShifts(updatedShifts);

} else if (modalType === 'SHIFT_OVERRIDE') {

// ============================================================================
// SECTION 2: Update the handleDelete function (SHIFT case)
// ============================================================================
// Find this section around line 161-164 in Organization.tsx
// Replace the SHIFT case with:

} else if (type === 'SHIFT' as any) {
  // NEW APPROACH: Use individual delete operation
  const shiftId = shifts[index].id;
  await hrService.deleteShift(shiftId);

  // Reload shifts from server
  const updatedShifts = await hrService.getShifts();
  setShifts(updatedShifts);

} else if (type === 'SHIFT_OVERRIDE' as any) {

// ============================================================================
// SECTION 3: Update useOrganization.ts
// ============================================================================

/**
 * In src/hooks/organization/useOrganization.ts
 *
 * REMOVE these functions (they're no longer needed):
 * - updateShifts
 * - updateShiftOverrides
 *
 * The hrService now provides:
 * - createShift(shift)
 * - updateShift(id, shift)
 * - deleteShift(id)
 *
 * So Organization.tsx will call hrService directly for shift mutations.
 */

// BEFORE (in useOrganization.ts):
const updateShifts = async (newShifts: Shift[]) => {
  setIsSaving(true);
  await hrService.setShifts(newShifts);
  setShifts(newShifts);
  setIsSaving(false);
};

// AFTER: REMOVE this function entirely
// Organization.tsx will use hrService.createShift/updateShift/deleteShift directly

// ============================================================================
// SECTION 4: Update hrService.ts
// ============================================================================

/**
 * In src/services/hrService.ts
 *
 * ADD these new methods:
 */

// Add to hrService object:
export const hrService = {
  // ... existing methods ...

  // NEW METHODS:
  createShift: shiftService.createShift.bind(shiftService),
  updateShift: shiftService.updateShift.bind(shiftService),
  deleteShift: shiftService.deleteShift.bind(shiftService),

  // Keep getShifts for loading:
  getShifts: shiftService.getShifts.bind(shiftService),

  // REMOVE or DEPRECATE:
  // setShifts: shiftService.setShifts.bind(shiftService), // No longer needed
};

// ============================================================================
// SECTION 5: Updated Organization.tsx imports and state
// ============================================================================

// At the top of Organization.tsx, ensure you have local state for shifts:
const [shifts, setShifts] = useState<Shift[]>([]);

// In the useOrganization hook call, REMOVE shifts from the returned values:
const {
  departments, designations, holidays, teams, employees, leavePolicy, config, workflows,
  // shifts, // REMOVE - we manage this locally now
  shiftOverrides,
  isLoading, isSaving,
  updateDepartments, updateDesignations, updateHolidays, saveTeam, deleteTeam,
  updateLeavePolicy, saveConfig, updateWorkflows,
  // updateShifts, // REMOVE - no longer needed
  updateShiftOverrides
} = useOrganization();

// Then load shifts separately:
useEffect(() => {
  const loadShifts = async () => {
    const shiftsData = await hrService.getShifts();
    setShifts(shiftsData);
  };
  loadShifts();
}, []); // Load once on mount

// ============================================================================
// COMPLETE EXAMPLE: Updated Organization.tsx shift management
// ============================================================================

// Here's how the complete flow looks:

// 1. USER CLICKS "ADD SHIFT" BUTTON
const openModal = (type: typeof modalType, index: number | null = null) => {
  setModalType(type);
  setEditIndex(index);
  if (type === 'SHIFT') {
    if (index !== null) {
      // Editing existing shift
      setShiftForm({ ...shifts[index] });
    } else {
      // Creating new shift
      setShiftForm({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        lateGracePeriod: 5,
        earlyOutGracePeriod: 15,
        earliestCheckIn: '06:00',
        autoSessionCloseTime: '23:59',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Sunday'],
        isDefault: false
      });
    }
  }
  setShowModal(true);
};

// 2. USER SUBMITS THE FORM
const handleModalSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!canWrite) {
    alert('Your subscription does not allow modifications. Please upgrade to continue.');
    return;
  }
  try {
    if (modalType === 'SHIFT') {
      if (editIndex !== null) {
        // Update existing shift
        const shiftId = shifts[editIndex].id;
        console.log('[Organization] Updating shift:', shiftId, shiftForm);
        await hrService.updateShift(shiftId, shiftForm);
      } else {
        // Create new shift
        console.log('[Organization] Creating new shift:', shiftForm);
        await hrService.createShift(shiftForm);
      }

      // Reload shifts from server
      const updatedShifts = await hrService.getShifts();
      setShifts(updatedShifts);
      setShowModal(false);
    }
  } catch (err) {
    console.error('[Organization] Shift save failed:', err);
    alert('Operation failed.');
  }
};

// 3. USER DELETES A SHIFT
const handleDelete = async (type: typeof modalType, index: number) => {
  if (!confirm(`Confirm deletion?`)) return;
  try {
    if (type === 'SHIFT' as any) {
      const shiftId = shifts[index].id;
      console.log('[Organization] Deleting shift:', shiftId);
      await hrService.deleteShift(shiftId);

      // Reload shifts from server
      const updatedShifts = await hrService.getShifts();
      setShifts(updatedShifts);
    }
  } catch (err) {
    console.error('[Organization] Shift delete failed:', err);
    alert('Delete failed.');
  }
};

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/**
 * [ ] 1. Run PocketBase migration script (SHIFTS_MIGRATION_SCRIPT.js)
 * [ ] 2. Verify shifts collection has data
 * [ ] 3. Update src/services/shift.service.ts (replace with shift.service.NEW.ts)
 * [ ] 4. Update src/services/hrService.ts (add createShift, updateShift, deleteShift)
 * [ ] 5. Update src/hooks/organization/useOrganization.ts (remove updateShifts)
 * [ ] 6. Update src/pages/Organization.tsx (use CRUD operations instead of array updates)
 * [ ] 7. Test creating a new shift
 * [ ] 8. Test editing an existing shift
 * [ ] 9. Test deleting a shift
 * [ ] 10. Test shift assignment to employees
 * [ ] 11. Verify default shift logic works
 * [ ] 12. Test shift resolution for attendance
 */
