
# PocketBase Schema V2 (Multi-Tenant)

To support multiple organizations, we must add an `organizations` collection and link **ALL** other collections to it. We then use API Rules to enforce isolation.

## 🚨 IMPORTANT: "Failed to resolve field" Error?
If you get an error like `invalid left operand ...`, it means the fields (`role`, `organization_id`) have not been saved to the database yet.
**FIX:** Add the fields in the "Fields" tab, click **Save Changes**, then go back to the "API Rules" tab to add the rules.

---

## 1. New Collection: `organizations`
Stores the high-level account details for a company.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `name` | Text | Yes | e.g. "Acme Corp" |
| `address` | Text | No | Billing address |
| `subscription_status` | Select | Yes | `ACTIVE`, `TRIAL`, `EXPIRED` |
| `logo` | File | No | Org branding |

**API Rules:**
*   **List/View:** `@request.auth.organization_id = id`
    *   *Translation: Users can only see their own organization.*
*   **Create:** `Admin Only` (Leave Empty & **Locked**)
    *   *Note: Public registration is now handled securely by the `main.pb.js` server hook. We lock this to prevent direct API spam.*
*   **Update:** `@request.auth.organization_id = id && @request.auth.role = 'ADMIN'`
*   **Delete:** `Admin Only` (Locked)

---

## 2. Updated Collection: `users`
**Step 1:** Add these fields first AND SAVE:

| Field | Type | Notes |
| :--- | :--- | :--- |
| `organization_id` | Relation | **Target:** `organizations`. **Max:** 1. **Required:** Yes. |
| `role` | Select | Options: `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| `department` | Text | |
| `designation` | Text | |
| `employee_id` | Text | |
| `line_manager_id` | Relation | Target: `users` |
| `team_id` | Relation | Target: `teams` |

**Step 2:** Apply these API Rules:

*   **List/View:** `@request.auth.organization_id = organization_id`
    *(Translation: I can only see users who belong to the same organization as me)*
    
*   **Create:** 
    ```javascript
    @request.auth.organization_id = @request.data.organization_id && (@request.auth.role = "ADMIN" || @request.auth.role = "HR")
    ```
    *Translation: Only logged-in Admins/HR can create new users, and they must create them within their own organization.*
    *Note: The initial Owner/Admin account is created by the server hook, bypassing this rule.*

*   **Update:** `id = @request.auth.id || @request.auth.role = "ADMIN" || @request.auth.role = "HR"`

---

## 3. Updated Collection: `settings`
This is critical. Settings are no longer global.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `organization_id` | Relation | **Target:** `organizations`. **Max:** 1. **Required:** Yes. |

**Uniqueness Constraint:**
*   (Optional but recommended): Set a Unique index on `key` + `organization_id`.

**API Rules:**
*   **List/View:** `@request.auth.organization_id = organization_id`
*   **Create/Update:** `@request.auth.organization_id = organization_id && @request.auth.role = 'ADMIN'`

---

## 4. Updates to Transactional Collections
Apply `organization_id` relation to **ALL** the following collections:
1.  `attendance`
2.  `leaves`
3.  `teams`
4.  `reports_queue`

**Generic API Rule for these collections:**
*   **List/View:** `@request.auth.organization_id = organization_id`
*   **Create:** `@request.data.organization_id = @request.auth.organization_id`
    *(Security: Ensure a user cannot maliciously create a record for another org)*
*   **Update:** `(employee_id = @request.auth.id || @request.auth.role = "ADMIN" || @request.auth.role = "HR") && @request.auth.organization_id = organization_id`

---

## 5. Summary of `pb_hooks/main.pb.js` Role

The Javascript file in `pb_hooks` runs with **System Admin Privileges**. 
1.  When you use the Registration Page in the app, it hits `/api/openhr/register`.
2.  The hook intercepts this.
3.  The hook creates the `organization` and the first `user` directly in the database.
4.  Because it runs on the server, it ignores the "Locked" status of the `organizations` create rule.
5.  This is much safer than leaving the API Rule open to the public.
