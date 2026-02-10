
# Codebase Cleanup Report

After refactoring the application into a modular architecture, the following files have been identified as redundant or obsolete.

## 1. Redundant Hooks
*   **`src/hooks/useAttendanceLogic.ts`**: **DELETE**.
    *   *Reason*: This was the old monolithic hook. It has been replaced by the granular `src/hooks/attendance/useAttendance.ts`.
*   **`src/hooks/useCameraLocation.ts`**: **DELETE**.
    *   *Reason*: This logic has been split into `src/hooks/attendance/useCamera.ts` and `src/hooks/attendance/useGeoLocation.ts` for better separation of concerns.

## 2. Redundant Services / Files
*   **`src/services/reportsEmailService.tsx`**: **RENAME/CONVERT**.
    *   *Reason*: Services should be `.ts` files, not `.tsx`, as they do not contain React Components. Although the file generates HTML strings, it is logic, not a UI component.
    *   *Action*: Renamed to `src/services/reportsEmailService.ts`.

## 3. Documentation Cleanup
*   **`firebase-setup-playbook.md`**: **DELETE**. (Already removed).
*   **`supabase-setup-playbook.md`**: **DELETE**. (Already removed).
*   *Note*: `pocketbase-setup-playbook.md` should be **KEPT** as it is the current active backend documentation.

## 4. General Recommendations
*   Ensure all imports in `src/pages/Attendance.tsx` point to `hooks/attendance/...` and not the old root hooks.
*   Ensure `src/services/emailService.ts` imports from the new `.ts` version of reports service.

## Summary
The application structure is now significantly cleaner. Logic is isolated in `hooks/`, data access in `services/`, and global state in `context/`. The `components/` folder is focused purely on presentation.
