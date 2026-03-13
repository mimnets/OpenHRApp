# OpenHR Guides — SEO Rewrite & Internal Linking Plan

> This document defines the full strategy for rewriting the GUIDES_CONTENT.md tutorials to improve SEO rankings and implement internal linking. If the process breaks at any point, resume from the **Progress Tracker** section below.

---

## 1. Goals

1. **SEO-optimize every tutorial** — Target keywords in headings, excerpts, and body text so guides rank for relevant search queries (e.g., "how to track attendance with selfie," "open source leave management system").
2. **Internal linking** — Add contextual links between tutorials using `/how-to-use/{slug}` URLs so readers (and search engines) can navigate the full guide hierarchy.
3. **Cross-link to features/blog** — Link to `https://openhrapp.com/features/{feature}` and `https://openhrapp.com/blog` where relevant for external SEO value.
4. **Keep structure identical** — Every tutorial must retain the exact same metadata format: Slug, Category, Display Order, Parent, Excerpt, and Content sections.

---

## 2. URL Map for Internal Links

All tutorial links use the format: `/how-to-use/{slug}`

### Tutorial Slug Map (25 tutorials)

| # | Slug | Title | Category |
|---|------|-------|----------|
| 1 | `welcome-to-openhr` | Welcome to OpenHR — Your First Steps | Getting Started |
| 2 | `how-to-clock-in-and-out` | How to Clock In and Out | Attendance |
| 3 | `understanding-attendance-logs` | Understanding Your Attendance Logs | Attendance |
| 4 | `attendance-admin-audit` | Attendance for Admins — Audit and Manual Entries | Attendance |
| 5 | `how-to-apply-for-leave` | How to Apply for Leave | Leave |
| 6 | `leave-approval-for-managers` | Leave Approval — For Managers | Leave |
| 7 | `leave-approval-for-hr` | Leave Approval — For HR and Admins | Leave |
| 8 | `understanding-leave-policies` | Understanding Leave Policies | Leave |
| 9 | `managing-employees` | Managing Employees — Adding and Editing Staff | Employees |
| 10 | `setting-up-organization` | Setting Up Your Organization | Organization |
| 11 | `generating-reports` | Generating Reports | Reports |
| 12 | `managing-profile-settings` | Managing Your Profile and Settings | Settings |
| 13 | `roles-and-permissions` | Roles and Permissions in OpenHR | Getting Started |
| 14 | `install-openhr-pwa` | Install OpenHR as an App (PWA) | Getting Started |
| 15 | `performance-review-self-assessment` | Performance Reviews — Employee Self-Assessment | Performance Reviews |
| 16 | `performance-review-for-managers` | Performance Reviews — For Managers | Performance Reviews |
| 17 | `performance-review-hr-calibration` | Performance Reviews — HR Calibration | Performance Reviews |
| 18 | `announcements-guide` | Announcements — Viewing and Creating | Announcements |
| 19 | `notifications-guide` | Notifications — Bell Notifications and Admin Management | Settings |
| 20 | `theme-customization` | Theme Customization | Settings |
| 21 | `custom-leave-types` | Custom Leave Types and Special Leave | Leave |
| 22 | `notification-settings` | Configuring Notification Settings | Organization |
| 23 | `understanding-dashboard` | Understanding the Dashboard | Getting Started |
| 24 | `subscription-upgrade-options` | Subscription and Upgrade Options | Getting Started |
| 25 | `exporting-employee-data` | Exporting Employee Data | Reports |

### External Link Targets

| URL | Context |
|-----|---------|
| `https://openhrapp.com/features/attendance-tracking` | Attendance guides |
| `https://openhrapp.com/features/biometric-selfie-verification` | Selfie/clock-in guides |
| `https://openhrapp.com/features/gps-geofencing` | GPS/location guides |
| `https://openhrapp.com/features/leave-management` | Leave guides |
| `https://openhrapp.com/features/performance-reviews` | Performance review guides |
| `https://openhrapp.com/features/employee-directory` | Employee guides |
| `https://openhrapp.com/features/reports-analytics` | Reports guides |
| `https://openhrapp.com` | General CTAs |
| `https://openhrapp.com/blog` | Blog cross-links |

---

## 3. Internal Linking Strategy

### Rules

1. **Every tutorial must link to at least 2 other tutorials** using keyword-rich anchor text.
2. **Parent tutorials link to their children** in a "Related Guides" or "Next Steps" section at the bottom.
3. **Child tutorials link back to their parent** near the top ("This guide is part of...").
4. **Cross-category links** where naturally relevant (e.g., leave guide → organization setup for workflow config).
5. **Feature page links** for primary keywords (e.g., first mention of "attendance tracking" links to the features page).
6. **No orphan pages** — every tutorial must be reachable via at least 2 internal links from other tutorials.

### Linking Map (Tutorial → Links To)

| Tutorial | Internal Links (by slug) | External Links |
|----------|--------------------------|----------------|
| 1. welcome-to-openhr | 2, 5, 10, 13, 14, 23 | features page |
| 2. how-to-clock-in-and-out | 1, 3, 4, 10 | biometric-selfie, gps-geofencing, attendance-tracking |
| 3. understanding-attendance-logs | 2, 4, 11 | attendance-tracking |
| 4. attendance-admin-audit | 2, 3, 9, 10, 11 | attendance-tracking |
| 5. how-to-apply-for-leave | 1, 6, 7, 8, 21 | leave-management |
| 6. leave-approval-for-managers | 5, 7, 8, 19 | leave-management |
| 7. leave-approval-for-hr | 5, 6, 8, 9, 21 | leave-management |
| 8. understanding-leave-policies | 5, 7, 10, 21 | leave-management |
| 9. managing-employees | 1, 10, 13, 25 | employee-directory |
| 10. setting-up-organization | 1, 2, 5, 8, 9, 22 | features page |
| 11. generating-reports | 3, 4, 25, 9 | reports-analytics |
| 12. managing-profile-settings | 1, 19, 20 | — |
| 13. roles-and-permissions | 1, 9, 4, 6, 7 | — |
| 14. install-openhr-pwa | 1, 2, 23 | — |
| 15. performance-review-self-assessment | 16, 17, 1 | performance-reviews |
| 16. performance-review-for-managers | 15, 17, 6 | performance-reviews |
| 17. performance-review-hr-calibration | 15, 16, 7 | performance-reviews |
| 18. announcements-guide | 1, 19, 13 | — |
| 19. notifications-guide | 12, 18, 22, 6 | — |
| 20. theme-customization | 12, 1 | — |
| 21. custom-leave-types | 5, 7, 8, 10 | leave-management |
| 22. notification-settings | 10, 19 | — |
| 23. understanding-dashboard | 1, 2, 5, 13, 14 | features page |
| 24. subscription-upgrade-options | 1, 14 | openhrapp.com |
| 25. exporting-employee-data | 9, 11 | reports-analytics |

---

## 4. SEO Improvements Per Tutorial

### Keyword Targets

| Tutorial | Primary Keyword | Secondary Keywords |
|----------|----------------|-------------------|
| 1 | open source HR software | HR management system, employee management, free HR tool |
| 2 | selfie attendance system | GPS attendance, clock in clock out, biometric attendance |
| 3 | attendance logs | attendance history, attendance records, employee attendance report |
| 4 | attendance audit | manual attendance entry, admin attendance, edit attendance |
| 5 | apply for leave online | leave request, leave balance, leave application |
| 6 | leave approval workflow | manager leave approval, approve leave request |
| 7 | HR leave management | admin leave approval, leave administration |
| 8 | leave policy configuration | leave types, leave allocation, leave quota |
| 9 | employee directory management | add employee, employee onboarding, staff management |
| 10 | organization setup HR | department setup, shift configuration, office location GPS |
| 11 | HR reports export | attendance report CSV, leave report, HR analytics |
| 12 | employee profile settings | change password, profile update |
| 13 | role-based access control | HR permissions, employee roles, RBAC |
| 14 | progressive web app install | PWA install, add to home screen, mobile HR app |
| 15 | employee self-assessment | performance review, competency rating, self-evaluation |
| 16 | manager performance review | evaluate employee, manager feedback, performance rating |
| 17 | HR calibration review | finalize performance review, HR review, overall rating |
| 18 | company announcements | organization announcements, internal communication |
| 19 | notification management | bell notifications, email notifications, notification settings |
| 20 | app theme customization | dark mode, light mode, color theme |
| 21 | custom leave types | maternity leave, paternity leave, special leave, unpaid leave |
| 22 | notification configuration | email notification settings, SMTP, notification retention |
| 23 | HR dashboard guide | admin dashboard, manager dashboard, employee dashboard |
| 24 | HR software pricing | free HR software, open source pricing, subscription |
| 25 | export employee data | CSV export, PDF export, employee roster |

### Content Improvements Applied to All Tutorials

1. **Answer-first format** — Open each tutorial with a clear 1–2 sentence answer to the implied question before diving into steps.
2. **Keyword-rich headings** — H4 headings include target keywords naturally (e.g., "#### How to Clock In Using Selfie Verification" instead of "#### Step 1").
3. **Improved excerpts** — Excerpts rewritten to include primary keywords and be compelling meta descriptions (~155 chars).
4. **Contextual internal links** — Links placed on relevant keyword phrases mid-content, not just in "Next Steps" sections.
5. **Related Guides section** — Every tutorial ends with a "Related Guides" section with 2–4 linked tutorials.
6. **First-mention feature links** — First mention of a major feature links to the features page.
7. **Structured data compatibility** — Content structured so each H4 section could be a FAQ answer or featured snippet.

---

## 5. File Structure (No Changes)

The rewrite modifies only one file:

- **`Others/GUIDES_CONTENT.md`** — All 25 tutorials rewritten in-place

The structure of each tutorial remains identical:

```
### Tutorial N: Title

**Slug:** `slug-value`
**Category:** Category Name
**Display Order:** N
**Parent:** Parent Title or None
**Excerpt:** SEO-optimized excerpt

---

**Content:**

[Rewritten content with internal links and SEO improvements]

---
```

---

## 6. Progress Tracker

Use this to resume if the process breaks. Mark each tutorial as Done when its rewrite is complete.

| # | Tutorial | Status |
|---|----------|--------|
| 1 | welcome-to-openhr | Done |
| 2 | how-to-clock-in-and-out | Done |
| 3 | understanding-attendance-logs | Done |
| 4 | attendance-admin-audit | Done |
| 5 | how-to-apply-for-leave | Done |
| 6 | leave-approval-for-managers | Done |
| 7 | leave-approval-for-hr | Done |
| 8 | understanding-leave-policies | Done |
| 9 | managing-employees | Done |
| 10 | setting-up-organization | Done |
| 11 | generating-reports | Done |
| 12 | managing-profile-settings | Done |
| 13 | roles-and-permissions | Done |
| 14 | install-openhr-pwa | Done |
| 15 | performance-review-self-assessment | Done |
| 16 | performance-review-for-managers | Done |
| 17 | performance-review-hr-calibration | Done |
| 18 | announcements-guide | Done |
| 19 | notifications-guide | Done |
| 20 | theme-customization | Done |
| 21 | custom-leave-types | Done |
| 22 | notification-settings | Done |
| 23 | understanding-dashboard | Done |
| 24 | subscription-upgrade-options | Done |
| 25 | exporting-employee-data | Done |

---

## 7. Verification Checklist

After all tutorials are rewritten:

- [ ] Every tutorial has at least 2 internal links to other tutorials
- [ ] Every internal link uses the format `/how-to-use/{slug}`
- [ ] Every tutorial has a "Related Guides" section at the bottom
- [ ] Excerpts are under 160 characters and contain primary keywords
- [ ] No broken links (all slugs match the slug map above)
- [ ] No orphan tutorials (every tutorial is linked from at least 2 others)
- [ ] Structure matches original format (Slug, Category, Display Order, Parent, Excerpt, Content)
- [ ] Feature page links use `https://openhrapp.com/features/{feature}`
- [ ] Content reads naturally — SEO keywords are not stuffed or forced
- [ ] Changelog updated in `src/data/changelog.ts`

---

## 8. How to Apply the Changes

1. Copy the rewritten content from `Others/GUIDES_CONTENT.md`
2. Open the OpenHR admin panel → Super Admin → Tutorials tab
3. For each tutorial, update the content field with the new content
4. The internal links (`/how-to-use/{slug}`) will work automatically as the app uses these URLs for tutorial pages
5. External links (`https://openhrapp.com/features/...`) open in new tabs via the HTML `<a>` tags

---
