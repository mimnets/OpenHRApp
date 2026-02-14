/**
 * PocketBase Migration Script: Settings-based Shifts → Dedicated Shifts Collection
 *
 * HOW TO RUN THIS SCRIPT:
 * 1. Open PocketBase Admin UI: http://localhost:8090/_/
 * 2. Go to: Settings (⚙️) → API Preview
 * 3. Copy and paste this entire script
 * 4. Click "Execute"
 * 5. Check console output for migration results
 *
 * WHAT THIS SCRIPT DOES:
 * - Reads all shifts from settings collection
 * - Creates corresponding records in the new shifts collection
 * - Preserves all shift data (name, times, grace periods, working days, etc.)
 * - Maps old shift IDs to new shift IDs for reference updates
 *
 * PREREQUISITES:
 * - You must create the "shifts" collection first (see SHIFTS_MIGRATION_GUIDE.md)
 * - Backup your database before running
 */

(function migrateShiftsToCollection() {
  console.log("=== Starting Shifts Migration ===");

  try {
    // Step 1: Get all settings records with key = "shifts"
    const settingsRecords = $app.dao().findRecordsByFilter(
      "settings",
      "key = 'shifts'",
      "-created",
      0,
      0
    );

    console.log(`Found ${settingsRecords.length} organizations with shifts to migrate`);

    if (settingsRecords.length === 0) {
      console.log("No shifts found in settings. Migration complete (nothing to do).");
      return;
    }

    // Step 2: Get the shifts collection
    const shiftsCollection = $app.dao().findCollectionByNameOrId("shifts");

    // Step 3: Track migration statistics
    let totalShiftsMigrated = 0;
    let errorCount = 0;
    const idMapping = {}; // Maps old shift_id to new shift_id

    // Step 4: Process each organization's shifts
    for (let i = 0; i < settingsRecords.length; i++) {
      const settingRecord = settingsRecords[i];
      const orgId = settingRecord.getString("organization_id");
      const shiftsData = settingRecord.get("value"); // Array of shift objects

      console.log(`\nProcessing organization: ${orgId}`);
      console.log(`  Shifts to migrate: ${shiftsData ? shiftsData.length : 0}`);

      if (!shiftsData || shiftsData.length === 0) {
        console.log("  Skipping - no shifts data");
        continue;
      }

      // Step 5: Create shift records for this organization
      for (let j = 0; j < shiftsData.length; j++) {
        const shiftData = shiftsData[j];
        const oldShiftId = shiftData.id;

        try {
          // Create new shift record
          const shiftRecord = new Record(shiftsCollection);
          shiftRecord.set("name", shiftData.name || "Unnamed Shift");
          shiftRecord.set("startTime", shiftData.startTime || "09:00");
          shiftRecord.set("endTime", shiftData.endTime || "18:00");
          shiftRecord.set("lateGracePeriod", shiftData.lateGracePeriod || 15);
          shiftRecord.set("earlyOutGracePeriod", shiftData.earlyOutGracePeriod || 15);
          shiftRecord.set("earliestCheckIn", shiftData.earliestCheckIn || "06:00");
          shiftRecord.set("autoSessionCloseTime", shiftData.autoSessionCloseTime || "23:59");
          shiftRecord.set("workingDays", shiftData.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Sunday"]);
          shiftRecord.set("isDefault", shiftData.isDefault || false);
          shiftRecord.set("organization_id", orgId);

          $app.dao().saveRecord(shiftRecord);

          const newShiftId = shiftRecord.getId();
          idMapping[oldShiftId] = newShiftId;

          console.log(`  ✓ Migrated: "${shiftData.name}" (${oldShiftId} → ${newShiftId})`);
          totalShiftsMigrated++;

        } catch (err) {
          console.error(`  ✗ Failed to migrate shift "${shiftData.name}":`, err.toString());
          errorCount++;
        }
      }
    }

    // Step 6: Update user shift_id references
    console.log("\n=== Updating User References ===");

    try {
      const usersWithShifts = $app.dao().findRecordsByFilter(
        "users",
        "shift_id != ''",
        "-created",
        0,
        0
      );

      console.log(`Found ${usersWithShifts.length} users with shift assignments`);

      let usersUpdated = 0;
      let usersSkipped = 0;

      for (let i = 0; i < usersWithShifts.length; i++) {
        const user = usersWithShifts[i];
        const oldShiftId = user.getString("shift_id");
        const newShiftId = idMapping[oldShiftId];

        if (newShiftId) {
          try {
            user.set("shift_id", newShiftId);
            $app.dao().saveRecord(user);
            usersUpdated++;
            console.log(`  ✓ Updated user ${user.getString("name")}: ${oldShiftId} → ${newShiftId}`);
          } catch (err) {
            console.error(`  ✗ Failed to update user ${user.getString("name")}:`, err.toString());
            errorCount++;
          }
        } else {
          console.log(`  ⚠ Skipped user ${user.getString("name")}: old shift_id "${oldShiftId}" not found in mapping`);
          usersSkipped++;
        }
      }

      console.log(`\nUser references updated: ${usersUpdated}, skipped: ${usersSkipped}`);

    } catch (err) {
      console.error("Error updating user references:", err.toString());
    }

    // Step 7: Print migration summary
    console.log("\n=== Migration Summary ===");
    console.log(`Total shifts migrated: ${totalShiftsMigrated}`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log(`Organizations processed: ${settingsRecords.length}`);

    // Step 8: Print ID mapping for reference
    console.log("\n=== Shift ID Mapping ===");
    console.log("Old ID → New ID:");
    for (const oldId in idMapping) {
      console.log(`  ${oldId} → ${idMapping[oldId]}`);
    }

    console.log("\n=== IMPORTANT: Next Steps ===");
    console.log("1. Verify shifts in PocketBase Admin → Collections → shifts");
    console.log("2. Verify user shift_id values have been updated");
    console.log("3. Update frontend code (see SHIFTS_MIGRATION_GUIDE.md)");
    console.log("4. Test shift assignment in the application");
    console.log("5. Once verified, you can delete the old settings records with key='shifts'");
    console.log("\n=== Migration Complete ===");

  } catch (err) {
    console.error("CRITICAL ERROR during migration:", err.toString());
    console.error("Stack:", err.stack);
  }
})();
