
console.log("[HOOKS] Loading Cron Jobs...");

/* ============================================================
   AUTO-ABSENT AUTOMATION (Minute Watcher)
   Job ID: "auto_absent_check"
   Schedule: "* * * * *" (Every minute)
   ============================================================ */
cronAdd("auto_absent_check", "* * * * *", () => {
    try {
        const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
        const config = configRecord.get("value");
        
        // Silent exit if feature is disabled
        if (!config || !config.autoAbsentEnabled) return;

        // 1. DETERMINE CURRENT TIME IN TARGET TIMEZONE
        // If config.timezone is set (e.g. "Asia/Dhaka"), use it. Otherwise use Server System Time.
        const now = new Date();
        let localDate = now;
        
        // PocketBase JSVM (Goja) has limited Intl support, but we can try basic offset or rely on System Time.
        // For robustness in this environment, we primarily rely on Server System Time but allow manual offset adjustment if needed.
        // Note: For best results, ensure your Server OS Timezone matches your Office Location.

        const h = ("0" + localDate.getHours()).slice(-2);
        const m = ("0" + localDate.getMinutes()).slice(-2);
        const currentTimeStr = h + ":" + m;
        
        const targetTime = config.autoAbsentTime || "23:55";

        // Only run if the minute matches exactly
        if (currentTimeStr !== targetTime) {
            return;
        }

        console.log("[CRON] ------------------------------------------------");
        console.log("[CRON] TIME MATCHED (" + currentTimeStr + ")! Starting Auto-Absent Process...");

        // 2. GENERATE 'YYYY-MM-DD' STRING
        // We manually construct this to ensure it matches the "Business Day" regardless of UTC offsets.
        const year = localDate.getFullYear();
        const month = ("0" + (localDate.getMonth() + 1)).slice(-2);
        const day = ("0" + localDate.getDate()).slice(-2);
        const dateStr = year + "-" + month + "-" + day;

        console.log("[CRON] Processing Business Date: " + dateStr);

        // 3. Validate Working Day
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[localDate.getDay()];

        if (!config.workingDays || !config.workingDays.includes(dayName)) {
            console.log("[CRON] Skipping: " + dayName + " is not a working day.");
            return;
        }

        // 4. Check Holidays
        try {
            const holidayRecord = $app.findFirstRecordByFilter("settings", "key = 'holidays'");
            const holidays = holidayRecord.get("value") || [];
            let isHoliday = false;
            for(let i=0; i<holidays.length; i++) {
                if (holidays[i].date === dateStr) { isHoliday = true; break; }
            }
            if (isHoliday) {
                console.log("[CRON] Skipping: Today is a holiday.");
                return;
            }
        } catch(e) { /* Ignore if settings missing */ }

        // 5. Fetch Employees & Process
        const employees = $app.findRecordsByFilter("users", "status = 'ACTIVE' && role != 'ADMIN'");
        let countMarked = 0;
        let countSkipped = 0;

        console.log("[CRON] Checking " + employees.length + " active employees...");

        employees.forEach((emp) => {
            const empId = emp.id;
            const empName = emp.getString("name");

            // A. Check if already Present (Any status: PRESENT, LATE, etc.)
            try {
                const att = $app.findFirstRecordByFilter("attendance", "employee_id = '" + empId + "' && date = '" + dateStr + "'");
                if (att) {
                    countSkipped++;
                    return; 
                }
            } catch(e) { /* No record found, continue */ }

            // B. Check if on Approved Leave
            try {
                const leave = $app.findFirstRecordByFilter(
                    "leaves", 
                    "employee_id = '" + empId + "' && status = 'APPROVED' && start_date <= '" + dateStr + "' && end_date >= '" + dateStr + "'"
                );
                if (leave) {
                    console.log("[CRON] Skip " + empName + ": On Approved Leave.");
                    countSkipped++;
                    return; 
                }
            } catch(e) { /* No leave found, continue */ }

            // C. Insert Absent Record
            try {
                const collection = $app.findCollectionByNameOrId("attendance");
                const record = new Record(collection);
                
                record.set("employee_id", empId);
                record.set("employee_name", empName);
                record.set("date", dateStr); // This is the crucial Business Date string
                record.set("status", "ABSENT");
                record.set("check_in", "-");
                record.set("check_out", "-");
                record.set("remarks", "System Auto-Absent: No punch by " + targetTime);
                record.set("location", "N/A");
                
                $app.save(record);
                
                console.log("[CRON] MARKED ABSENT: " + empName);
                countMarked++;
            } catch(err) {
                console.error("[CRON] FAILED to save absent for " + empName + ": " + err.toString());
            }
        });

        console.log("[CRON] Run Complete. Absent: " + countMarked + " | Skipped (Present/Leave): " + countSkipped);
        console.log("[CRON] ------------------------------------------------");

    } catch(e) {
        console.error("[CRON] Fatal Error: " + e.toString());
    }
});
