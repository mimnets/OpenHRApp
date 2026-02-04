
# PocketBase Schema V2 (Multi-Tenant)

To support multiple organizations, we must add an `organizations` collection and link **ALL** other collections to it. We then use API Rules to enforce isolation.

## 1. New Collection: `organizations`
Stores the high-level account details for a company.

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `name` | Text | Yes | e.g. "Acme Corp" |
| `address` | Text | No | Billing address |
| `subscription_status` | Select | Yes | `ACTIVE`, `TRIAL`, `EXPIRED` |
| `logo` | File | No | Org branding |

**API Rules:**
*   **List/View:** `@request.auth.organization_id = id` (Users can only see their own org)
*   **Create:** `""` (Public can register)
*   **Update:** `@request.auth.organization_id = id && @request.auth.role = 'ADMIN'`

---

## 2. Updated Collection: `users`
Add the link to the organization.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `organization_id` | Relation | **Target:** `organizations`. **Max:** 1. **Required:** Yes. |

**API Rules:**
*   **List/View:** `@request.auth.organization_id = organization_id`
    *(Translation: I can only see users who belong to the same organization as me)*
*   **Create:** `@request.auth.role = 'ADMIN' && @request.auth.organization_id = organization_id`
    *(Only Admins can create users, and they must create them within their own org)*

---

## 3. Updated Collection: `settings`
This is critical. Settings are no longer global.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `organization_id` | Relation | **Target:** `organizations`. **Max:** 1. **Required:** Yes. |

**Uniqueness Constraint:**
*   The combination of `key` + `organization_id` must be unique. (PocketBase might enforce unique on `key` by default, you must remove that global unique index and use a composite check or API logic).

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
    *As per Claude AI*
---

## 5. `pb_hooks/main.pb.js` Updates

The email hooks need to be aware of the organization context, primarily for template branding (e.g., using the specific Organization Name in the email footer instead of "OpenHR System").

```javascript
// Example modification in hook
var org = $app.findRecordById("organizations", user.getString("organization_id"));
var orgName = org.getString("name");
// Use orgName in email templates...
```
