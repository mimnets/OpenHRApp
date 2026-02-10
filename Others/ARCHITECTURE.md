
# OpenHR System Architecture & Developer Guide

## 1. System Overview
OpenHR is built on a **Modular Monolith** architecture using React (Frontend) and PocketBase (Backend). The application emphasizes "Separation of Concerns," ensuring that UI, Logic, and Data layers remain distinct.

## 2. Folder Structure & Purpose

### 📂 `src/layouts/`
**Purpose:** Contains the "App Shell" wrappers.
*   **`MainLayout.tsx`**: The master container. It holds the `Sidebar`, `TopHeader`, and Mobile Navigation. It handles the responsive state (mobile menu toggle) so pages don't have to.

### 📂 `src/context/`
**Purpose:** Global State Management (available to the entire app).
*   **`AuthContext.tsx`**: Manages the logged-in user's session. It provides `user`, `login`, and `logout` functions to any component, preventing "prop drilling" of user data.

### 📂 `src/hooks/`
**Purpose:** Custom React Hooks. This is where **Business Logic** lives. Pages should generally just be UI that calls these hooks.
*   **`attendance/`**:
    *   `useCamera.ts`: Handles the webcam/phone camera, permissions, and selfie capturing.
    *   `useGeoLocation.ts`: Handles GPS coordinates and Geofencing calculations.
    *   `useAttendance.ts`: The "Brain" of the attendance page. It talks to the API, decides if a user is Late/Present, and handles the submission process.
*   **`organization/`**:
    *   `useOrganization.ts`: Manages the complex state of the Org Chart, Teams, and Settings page (fetching, updating, and caching data).

### 📂 `src/services/`
**Purpose:** The Data Layer. All API calls to PocketBase happen here. **No UI component should ever call PocketBase directly.**
*   **`api.client.ts`**: The base setup. Handles the database connection and global event bus (subscription system).
*   **`auth.service.ts`**: Login, Logout, Password Reset.
*   **`attendance.service.ts`**: Clock-in/out CRUD operations.
*   **`employee.service.ts`**: User profile management.
*   **`leave.service.ts`**: Leave application and approval logic.
*   **`organization.service.ts`**: Config, Holidays, Teams, and Settings.
*   **`hrService.ts`**: A **Facade Pattern**. It groups all the specific services above into one `hrService` export. This makes it easy for components to import one file (`import { hrService } ...`) to access everything.

### 📂 `src/components/`
**Purpose:** "Dumb" UI components. They receive data via props and render HTML. They contain very little logic.
*   **`Sidebar.tsx`**: The main navigation menu.
*   **`attendance/`**: Sub-components for the Attendance page (Camera view, Actions bar).
*   **`leave/`**: Flow components for different roles (Employee view vs Manager view).
*   **`organization/`**: Visual components for Org Structure lists and Team cards.

### 📂 `src/pages/`
**Purpose:** Route Handlers. These correspond to screens in the app.
*   They act as the "Glue". They import a Hook (for logic) and a Component (for UI) and connect them together.

### 📂 `src/utils/`
**Purpose:** Pure helper functions.
*   **`dateUtils.ts`**: Formatting dates (e.g., "12 Jan 2024") and times consistently across the app.

---

## 3. Key Workflows

### The "Attendance" Flow
1.  **User enters `Attendance.tsx`**.
2.  Page calls `useAttendance`, `useCamera`, and `useGeoLocation`.
3.  **`useAttendance`** calls `hrService.getActiveAttendance` to see if user is already clocked in.
4.  **`useGeoLocation`** checks if `lat/lng` is inside a defined office radius (from `constants.tsx`).
5.  **User clicks "Clock In"**:
    *   `useAttendance` sends data to `hrService.saveAttendance`.
    *   `hrService` pushes data to PocketBase.
    *   `api.client` triggers a `notify()` event.
    *   Global listeners update (e.g., Dashboard stats refresh instantly).

### The "Leave" Flow
1.  **User enters `Leave.tsx`**.
2.  Page checks role (Employee vs Manager).
3.  **Employee View**: Renders `EmployeeLeaveFlow`.
    *   User submits form -> `employeeService.applyForLeave` -> PocketBase `leaves` collection.
    *   **PocketBase Hook (`main.pb.js`)** detects the new record and sends an email to the Manager.
4.  **Manager View**: Renders `ManagerLeaveFlow`.
    *   Fetches pending requests via `leave.service`.
    *   Approves/Rejects -> Updates DB -> PocketBase Hook sends email to Employee (and HR if approved).

