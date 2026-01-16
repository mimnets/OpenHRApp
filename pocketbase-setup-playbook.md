# OpenHR PocketBase Setup Playbook

PocketBase is the easiest way to run OpenHR locally or on a private server.

## 1. Installation
1. Download the executable from [pocketbase.io](https://pocketbase.io/).
2. Extract it and run: `./pocketbase serve`
3. Access the Admin UI at `http://127.0.0.1:8090/_/`

## 2. Server-Side Hooks (MANDATORY)
To enable email notifications, you must add the JS hooks:
1. Create a folder named `pb_hooks` inside your PocketBase folder.
2. Create a file named `main.pb.js` inside that folder.
3. Paste the content of `pb_hooks/main.pb.js` from this project into it.
4. Restart your PocketBase server.

## 3. Creating Collections (CRITICAL)
Create the following collections exactly as named. **Note:** Use snake_case for all field names.

### users (System Collection)
Add these fields:
- `role` (select: ADMIN, HR, MANAGER, EMPLOYEE)
- `department` (text)
- `designation` (text)
- `employee_id` (text)
- `line_manager_id` (relation: users, single)
- `avatar` (file)

### settings
- `key` (text, non-empty, unique)
- `value` (json)

### reports_queue (NEW - For Emails)
- `recipient_email` (email, non-empty)
- `subject` (text)
- `html_content` (text/editor)
- `status` (text) - Values: PENDING, SENT, FAILED
- `sent_at` (date/time)
- `failed_at` (date/time)
- `error_message` (text)

### attendance
- `employee_id` (relation: users, single)
- `employee_name` (text)
- `date` (text)
- `check_in` (text)
- `check_out` (text)
- `status` (text)
- `selfie` (file)
- `remarks` (text)
- `location` (text)

### leaves
- `employee_id` (relation: users, single)
- `employee_name` (text)
- `type` (text)
- `start_date` (text)
- `end_date` (text)
- `total_days` (number)
- `status` (text)
- `applied_date` (text)
- `reason` (text)
- `approver_remarks` (text)
- `manager_remarks` (text)

## 4. API Rules Matrix
| Collection | List/View | Create | Update |
|------------|-----------|--------|--------|
| **users** | `@request.auth.id != ""` | Admin only | `id = @request.auth.id || @request.auth.role = "ADMIN"` |
| **settings** | `@request.auth.id != ""` | `@request.auth.role = "ADMIN"` | `@request.auth.role = "ADMIN"` |
| **reports_queue** | `Admin only` | `@request.auth.id != ""` | `Admin only` |
| **attendance** | `@request.auth.id != ""` | `@request.auth.id != ""` | `@request.auth.role = "ADMIN"` |
| **leaves** | `@request.auth.id != ""` | `@request.auth.id != ""` | `@request.auth.id != ""` |