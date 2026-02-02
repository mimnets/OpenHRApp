
// CRON JOB HOOKS
// Loaded: Auto-Absent Logic

console.log("[HOOKS] Loading Cron Jobs...");

/* ============================================================
   AUTO-ABSENT AUTOMATION (Minute Watcher)
   Runs every minute to check if employees missed attendance.
   ============================================================ */
cronAdd("* * * * *", () => {
    try {
        const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
        const config = configRecord.get("value");
        
        // Exit if not enabled
        if (!config || !config.autoAbsentEnabled) return;

        // Check Time Match (Server Time)
        const now = new Date();
        const h = ("0" + now.getHours()).slice(-2);
        const m = ("0" + now.getMinutes()).slice(-2);
        const currentTimeStr = h + ":" + m;
        
        const targetTime = config.autoAbsentTime || "23:55";

        if (currentTimeStr !== targetTime) {
            return;
        }

        console.log("[CRON] Time matched (" + targetTime + "). Starting Auto-Absent Check...");

        // Validate Working Day
        const dateStr = now.toISOString().split('T')[0];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[now.getDay()];

        if (!config.workingDays || !config.workingDays.includes(dayName)) {
            console.log("[CRON] Skipping: " + dayName + " is not a working day.");
            return;
        }

        // Check Holidays
        try {
            const holidayRecord = $app.findFirstRecordByFilter("settings", "key = 'holidays'");
            const holidays = holidayRecord.get("value") || [];
            let isHoliday = false;
            for(var i=0; i<holidays.length; i++) {
                if (holidays[i].date === dateStr) { isHoliday = true; break; }
            }
            if (isHoliday) {
                console.log("[CRON] Skipping: Today is a holiday.");
                return;
            }
        } catch(e) { /* Ignore */ }

        // Fetch Employees
        const employees = $app.findRecordsByFilter("users", "status = 'ACTIVE' && role != 'ADMIN'");
        let countMarked = 0;

        employees.forEach(emp => {
            const empId = emp.id;

            // Check if already Present
            try {
                const att = $app.findFirstRecordByFilter("attendance", "employee_id = '" + empId + "' && date = '" + dateStr + "'");
                if (att) return; 
            } catch(e) { /* None found */ }

            // Check if on Approved Leave
            try {
                const leave = $app.findFirstRecordByFilter("leaves", "employee_id = '" + empId + "' && status = 'APPROVED' && start_date <= '" + dateStr + "' && end_date >= '" + dateStr + "'");
                if (leave) return; 
            } catch(e) { /* None found */ }

            // Insert Absent Record
            try {
                const collection = $app.findCollectionByNameOrId("attendance");
                const record = new Record(collection);
                record.set("employee_id", empId);
                record.set("employee_name", emp.getString("name"));
                record.set("date", dateStr);
                record.set("status", "ABSENT");
                record.set("check_in", "-");
                record.set("remarks", "System Auto-Absent: No punch recorded by " + targetTime);
                record.set("location", "N/A");
                
                $app.save(record);
                countMarked++;
            } catch(err) {
                console.error("[CRON] Failed to mark absent for " + empId + ": " + err);
            }
        });

        console.log("[CRON] Auto-Absent Complete. Marked " + countMarked + " employees as ABSENT.");

    } catch(e) {
        console.error("[CRON] Fatal Error: " + e.toString());
    }
});
