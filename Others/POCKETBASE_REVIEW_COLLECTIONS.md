# PocketBase Collections — Performance Review Module

Step-by-step guide for creating the two PocketBase collections required by the Performance Review module.

---

## Prerequisites

- PocketBase admin console access (`/_/` URL)
- The `users` and `organizations` collections must already exist

---

## Collection 1: `review_cycles`

Stores review cycle definitions (e.g., "Mid-Year 2025", "Year-End 2025").

### Create the Collection

1. Go to **Collections** in the PocketBase admin panel
2. Click **New collection**
3. Set **Name** to `review_cycles`
4. Set **Type** to `Base`
5. Add the fields below, then configure API rules

### Fields

Add each field in the order shown:

| # | Field Name | Type | Required | Options / Notes |
|---|-----------|------|----------|-----------------|
| 1 | `name` | **Text** | Yes | Max length: 200. Example: "Mid-Year 2025" |
| 2 | `cycle_type` | **Select** | Yes | Values: `MID_YEAR`, `YEAR_END` — Max select: 1 |
| 3 | `start_date` | **Date** | Yes | Review period start date |
| 4 | `end_date` | **Date** | Yes | Review period end date |
| 5 | `review_start_date` | **Date** | Yes | When employees can start submitting |
| 6 | `review_end_date` | **Date** | Yes | Submission deadline |
| 7 | `active_competencies` | **JSON** | Yes | Default value: `["AGILITY","COLLABORATION","CUSTOMER_FOCUS","DEVELOPING_OTHERS","GLOBAL_MINDSET","INNOVATION_MINDSET"]` |
| 8 | `is_active` | **Bool** | No | Only one cycle should be active at a time |
| 9 | `status` | **Select** | Yes | Values: `UPCOMING`, `OPEN`, `CLOSED`, `ARCHIVED` — Max select: 1 |
| 10 | `organization_id` | **Relation** | Yes | Related collection: `organizations` — Max select: 1 |

### Field-by-Field Setup Instructions

**Field 1 — `name`**
- Click **New field** → select **Text**
- Field name: `name`
- Toggle **Required** ON
- Max length: `200`

**Field 2 — `cycle_type`**
- Click **New field** → select **Select**
- Field name: `cycle_type`
- Toggle **Required** ON
- Add values (one per line):
  ```
  MID_YEAR
  YEAR_END
  ```
- Max select: `1`

**Field 3 — `start_date`**
- Click **New field** → select **Date**
- Field name: `start_date`
- Toggle **Required** ON

**Field 4 — `end_date`**
- Click **New field** → select **Date**
- Field name: `end_date`
- Toggle **Required** ON

**Field 5 — `review_start_date`**
- Click **New field** → select **Date**
- Field name: `review_start_date`
- Toggle **Required** ON

**Field 6 — `review_end_date`**
- Click **New field** → select **Date**
- Field name: `review_end_date`
- Toggle **Required** ON

**Field 7 — `active_competencies`**
- Click **New field** → select **JSON**
- Field name: `active_competencies`
- Toggle **Required** ON

**Field 8 — `is_active`**
- Click **New field** → select **Bool**
- Field name: `is_active`
- Required: OFF (defaults to `false`)

**Field 9 — `status`**
- Click **New field** → select **Select**
- Field name: `status`
- Toggle **Required** ON
- Add values (one per line):
  ```
  UPCOMING
  OPEN
  CLOSED
  ARCHIVED
  ```
- Max select: `1`

**Field 10 — `organization_id`**
- Click **New field** → select **Relation**
- Field name: `organization_id`
- Toggle **Required** ON
- Related collection: **organizations**
- Max select: `1`

### API Rules

Set these in the **API Rules** tab of the collection:

| Rule | Value |
|------|-------|
| **List/Search** | `organization_id = @request.auth.organization_id` |
| **View** | `organization_id = @request.auth.organization_id` |
| **Create** | `@request.auth.role = "ADMIN" \|\| @request.auth.role = "HR"` |
| **Update** | `@request.auth.role = "ADMIN" \|\| @request.auth.role = "HR"` |
| **Delete** | `@request.auth.role = "ADMIN" \|\| @request.auth.role = "HR"` |

---

## Collection 2: `performance_reviews`

Stores individual employee reviews with self-ratings, manager ratings, attendance/leave summaries, and HR finalization.

### Create the Collection

1. Go to **Collections** in the PocketBase admin panel
2. Click **New collection**
3. Set **Name** to `performance_reviews`
4. Set **Type** to `Base`
5. Add **all 42 fields** below in order, then configure API rules

### Fields Overview

This collection has 42 fields organized in 6 groups:

- **Core fields** (7 fields)
- **Workflow timestamps** (3 fields)
- **Self-assessment ratings** (12 fields — 6 competencies x 2)
- **Manager assessment ratings** (12 fields — 6 competencies x 2)
- **Attendance summary** (6 fields)
- **Leave summary + HR finalization** (7 fields)

---

### Group 1: Core Fields

| # | Field Name | Type | Required | Options / Notes |
|---|-----------|------|----------|-----------------|
| 1 | `employee_id` | **Relation** | Yes | Related collection: `users` — Max select: 1 |
| 2 | `employee_name` | **Text** | Yes | Denormalized for display |
| 3 | `cycle_id` | **Relation** | Yes | Related collection: `review_cycles` — Max select: 1 |
| 4 | `line_manager_id` | **Relation** | No | Related collection: `users` — Max select: 1 |
| 5 | `manager_name` | **Text** | No | Denormalized for display |
| 6 | `status` | **Select** | Yes | Values: `DRAFT`, `SELF_REVIEW_SUBMITTED`, `MANAGER_REVIEWED`, `COMPLETED` — Max select: 1 |
| 7 | `organization_id` | **Relation** | Yes | Related collection: `organizations` — Max select: 1 |

**Field-by-field:**

**Field 1 — `employee_id`**
- Type: **Relation**
- Required: ON
- Related collection: **users**
- Max select: `1`

**Field 2 — `employee_name`**
- Type: **Text**
- Required: ON

**Field 3 — `cycle_id`**
- Type: **Relation**
- Required: ON
- Related collection: **review_cycles**
- Max select: `1`

**Field 4 — `line_manager_id`**
- Type: **Relation**
- Required: OFF
- Related collection: **users**
- Max select: `1`

**Field 5 — `manager_name`**
- Type: **Text**
- Required: OFF

**Field 6 — `status`**
- Type: **Select**
- Required: ON
- Values:
  ```
  DRAFT
  SELF_REVIEW_SUBMITTED
  MANAGER_REVIEWED
  COMPLETED
  ```
- Max select: `1`

**Field 7 — `organization_id`**
- Type: **Relation**
- Required: ON
- Related collection: **organizations**
- Max select: `1`

---

### Group 2: Workflow Timestamps

| # | Field Name | Type | Required | Notes |
|---|-----------|------|----------|-------|
| 8 | `submitted_at` | **Date** | No | Set when employee submits self-review |
| 9 | `manager_reviewed_at` | **Date** | No | Set when manager submits their review |
| 10 | `completed_at` | **Date** | No | Set when HR finalizes the review |

All three: Type **Date**, Required OFF.

---

### Group 3: Self-Assessment Ratings (12 fields)

For each of the 6 competencies, create a `_rating` (Number) and `_comment` (Text) field.

| # | Field Name | Type | Required |
|---|-----------|------|----------|
| 11 | `self_agility_rating` | **Number** | No |
| 12 | `self_agility_comment` | **Text** | No |
| 13 | `self_collaboration_rating` | **Number** | No |
| 14 | `self_collaboration_comment` | **Text** | No |
| 15 | `self_customer_focus_rating` | **Number** | No |
| 16 | `self_customer_focus_comment` | **Text** | No |
| 17 | `self_developing_others_rating` | **Number** | No |
| 18 | `self_developing_others_comment` | **Text** | No |
| 19 | `self_global_mindset_rating` | **Number** | No |
| 20 | `self_global_mindset_comment` | **Text** | No |
| 21 | `self_innovation_mindset_rating` | **Number** | No |
| 22 | `self_innovation_mindset_comment` | **Text** | No |

**For each `_rating` field:**
- Type: **Number**
- Required: OFF
- Min: `0`, Max: `5`

**For each `_comment` field:**
- Type: **Text**
- Required: OFF

---

### Group 4: Manager Assessment Ratings (12 fields)

Same pattern as self-assessment, but prefixed with `manager_` instead of `self_`.

| # | Field Name | Type | Required |
|---|-----------|------|----------|
| 23 | `manager_agility_rating` | **Number** | No |
| 24 | `manager_agility_comment` | **Text** | No |
| 25 | `manager_collaboration_rating` | **Number** | No |
| 26 | `manager_collaboration_comment` | **Text** | No |
| 27 | `manager_customer_focus_rating` | **Number** | No |
| 28 | `manager_customer_focus_comment` | **Text** | No |
| 29 | `manager_developing_others_rating` | **Number** | No |
| 30 | `manager_developing_others_comment` | **Text** | No |
| 31 | `manager_global_mindset_rating` | **Number** | No |
| 32 | `manager_global_mindset_comment` | **Text** | No |
| 33 | `manager_innovation_mindset_rating` | **Number** | No |
| 34 | `manager_innovation_mindset_comment` | **Text** | No |

**For each `_rating` field:**
- Type: **Number**
- Required: OFF
- Min: `0`, Max: `5`

**For each `_comment` field:**
- Type: **Text**
- Required: OFF

---

### Group 5: Attendance Summary (6 fields)

These are auto-populated when a review is created.

| # | Field Name | Type | Required | Notes |
|---|-----------|------|----------|-------|
| 35 | `total_working_days` | **Number** | No | Total days in the review period |
| 36 | `present_days` | **Number** | No | Days marked PRESENT (includes LATE and EARLY_OUT) |
| 37 | `late_days` | **Number** | No | Days with LATE status |
| 38 | `absent_days` | **Number** | No | Days with ABSENT status |
| 39 | `early_out_days` | **Number** | No | Days with EARLY_OUT status |
| 40 | `attendance_percentage` | **Number** | No | Calculated: (present / total) * 100 |

All: Type **Number**, Required OFF, Min: `0`.

---

### Group 6: Leave Summary + HR Finalization (7 fields)

| # | Field Name | Type | Required | Notes |
|---|-----------|------|----------|-------|
| 41 | `annual_leave_taken` | **Number** | No | Approved annual leave days in period |
| 42 | `casual_leave_taken` | **Number** | No | Approved casual leave days in period |
| 43 | `sick_leave_taken` | **Number** | No | Approved sick leave days in period |
| 44 | `unpaid_leave_taken` | **Number** | No | Approved unpaid leave days in period |
| 45 | `total_leave_days` | **Number** | No | Sum of all leave types |
| 46 | `hr_final_remarks` | **Text** | No | HR's written final assessment |
| 47 | `hr_overall_rating` | **Select** | No | Values: `EXCELLENT`, `VERY_GOOD`, `GOOD`, `NEEDS_IMPROVEMENT`, `UNSATISFACTORY` — Max select: 1 |
| 48 | `finalized_by` | **Relation** | No | Related collection: `users` — Max select: 1 |

**Field 41–45 — Leave numbers:**
- Type: **Number**
- Required: OFF
- Min: `0`

**Field 46 — `hr_final_remarks`:**
- Type: **Text**
- Required: OFF

**Field 47 — `hr_overall_rating`:**
- Type: **Select**
- Required: OFF
- Values:
  ```
  EXCELLENT
  VERY_GOOD
  GOOD
  NEEDS_IMPROVEMENT
  UNSATISFACTORY
  ```
- Max select: `1`

**Field 48 — `finalized_by`:**
- Type: **Relation**
- Required: OFF
- Related collection: **users**
- Max select: `1`

---

### API Rules

Set these in the **API Rules** tab of the collection:

| Rule | Value |
|------|-------|
| **List/Search** | `organization_id = @request.auth.organization_id` |
| **View** | `organization_id = @request.auth.organization_id` |
| **Create** | `organization_id = @request.auth.organization_id` |
| **Update** | `organization_id = @request.auth.organization_id` |
| **Delete** | `@request.auth.role = "ADMIN" \|\| @request.auth.role = "HR"` |

---

## Verification Checklist

After creating both collections, verify:

- [ ] `review_cycles` collection exists with 10 fields
- [ ] `performance_reviews` collection exists with 48 fields
- [ ] All **Relation** fields point to the correct collections (`users`, `organizations`, `review_cycles`)
- [ ] All **Select** fields have the correct values listed
- [ ] All **Number** fields for ratings have Min: `0`, Max: `5`
- [ ] API rules are set on both collections
- [ ] Test: Log in as ADMIN → go to Performance Review → create a cycle → verify no errors in console

---

## Quick Reference: Field Name Mapping

The app uses camelCase internally but PocketBase uses snake_case. Here is the mapping used by `review.service.ts`:

```
App (camelCase)           →  PocketBase (snake_case)
─────────────────────────────────────────────────────
cycleType                 →  cycle_type
startDate                 →  start_date
endDate                   →  end_date
reviewStartDate           →  review_start_date
reviewEndDate             →  review_end_date
activeCompetencies        →  active_competencies
isActive                  →  is_active
organizationId            →  organization_id
employeeId                →  employee_id
employeeName              →  employee_name
cycleId                   →  cycle_id
lineManagerId             →  line_manager_id
managerName               →  manager_name
submittedAt               →  submitted_at
managerReviewedAt         →  manager_reviewed_at
completedAt               →  completed_at
selfRatings[AGILITY]      →  self_agility_rating / self_agility_comment
selfRatings[COLLABORATION]→  self_collaboration_rating / self_collaboration_comment
selfRatings[CUSTOMER_FOCUS]→ self_customer_focus_rating / self_customer_focus_comment
selfRatings[DEVELOPING_OTHERS]→ self_developing_others_rating / self_developing_others_comment
selfRatings[GLOBAL_MINDSET]→ self_global_mindset_rating / self_global_mindset_comment
selfRatings[INNOVATION_MINDSET]→ self_innovation_mindset_rating / self_innovation_mindset_comment
managerRatings[...]       →  manager_*_rating / manager_*_comment (same pattern)
totalWorkingDays          →  total_working_days
presentDays               →  present_days
lateDays                  →  late_days
absentDays                →  absent_days
earlyOutDays              →  early_out_days
attendancePercentage      →  attendance_percentage
annualLeaveTaken          →  annual_leave_taken
casualLeaveTaken          →  casual_leave_taken
sickLeaveTaken            →  sick_leave_taken
unpaidLeaveTaken          →  unpaid_leave_taken
totalLeaveDays            →  total_leave_days
hrFinalRemarks            →  hr_final_remarks
hrOverallRating           →  hr_overall_rating
finalizedBy               →  finalized_by
```
