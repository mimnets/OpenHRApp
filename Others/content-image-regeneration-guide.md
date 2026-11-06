# Regenerate the blog and guide images

The images for the blog and guides stayed on the old Supabase Cloud project during the move to the
self-hosted server. This guide lists every image that is needed, with a prompt for each one, and
explains how to upload them.

The list comes from the live database on 2026-11-06.

| What | Count | How to upload |
|---|---|---|
| Blog covers | 19 | Super Admin → Blog |
| Blog images inside articles | 43 | Studio → Storage, using the exact file name |
| Guide covers that are broken now | 3 | Super Admin → Guides |
| Guide covers that never existed (optional) | 21 | Super Admin → Guides |
| **Total** | **86** | |

---

## Before you start: you may not need to regenerate the blog images

The original files are still on the Cloud project. If you lift the Supabase restriction, even for a
short time, **Copy the files** on https://openhrapp.com/db-migrate restores all 62 blog images and the
3 guide covers, with no generating or uploading. You still need Step 1 below.

If you do regenerate, that copy skips any file name that already exists on the server, so your new
images are kept.

---

## Step 1: Fix the addresses in the articles (do this once)

The images inside articles have the **old Cloud address written into the article text**. Until this is
fixed, they stay broken, even after you upload the files. Covers are not affected.

Run this in Studio's SQL Editor at https://api.openhrapp.com:

```sql
update public.blog_posts
set content = replace(content,
  'https://cixryuwtlwbofabctrkk.supabase.co/storage/',
  'https://api.openhrapp.com/storage/')
where content like '%cixryuwtlwbofabctrkk.supabase.co/storage/%';

select count(*) as still_on_old_address
from public.blog_posts
where content like '%cixryuwtlwbofabctrkk.supabase.co%';
```

`still_on_old_address` must be `0`.

This changes only the address. If you ever revert to Cloud, run it again with the two addresses swapped.

---

## Step 2: Generate the images

### Sizes

| Image | Aspect ratio | Pixels |
|---|---|---|
| Cover | 1.91:1 | 1200×630 or larger |
| Inside an article | 16:9 | 1200×675 |

On a wide screen, the article page crops a cover to a thin strip across its middle. Keep the main subject
in the **middle band** of the image, with nothing important at the top or bottom. Every cover prompt
below assumes this.

### The shared style

Paste this at the start of each prompt, or once at the start of a chat if your tool keeps the context:

```
Style: clean modern flat vector illustration with soft shadows, plenty of white space, uncluttered. Color palette: muted blue #4a6fa5 as the main color, light blue #d4e4f7, slate gray, white, with small accents of amber #f59e0b and green #10b981. Consistent, professional, friendly SaaS look. Do not include any text, words, letters, numbers, logos, or watermarks. Any screen or interface shown is a simple fictional mockup with blank bars instead of text. Any people are simple stylized figures without realistic faces.
```

### Tool settings

| Tool | Settings |
|---|---|
| Midjourney | Add `--ar 1.91:1` for covers, `--ar 16:9` for article images, and `--no text, words, letters, logo` |
| ChatGPT / DALL·E | Ask for a wide landscape image |
| Stable Diffusion | Negative prompt: `text, watermark, signature, logo, blurry, distorted hands, distorted faces` |
| Gemini / Imagen | Ask for a wide landscape image, and repeat "no text" at the end |

### Check every image

- [ ] No garbled text, numbers or logos. Diagrams are the most likely to have these.
- [ ] No distorted hands or faces.
- [ ] No other company's logo or product.
- [ ] Main subject is in the middle band (covers).
- [ ] It looks like the same family as the other images.

These are illustrations, not screenshots. Where a reader needs to see the real screen, a real screenshot
of the app is better and more honest. If a diagram needs labels, generate it without text, then add
the labels in Canva or Figma.

---

## Step 3: Upload the images

### Covers (blog and guides): use Super Admin

The app converts covers to JPEG, which social media previews need, and links them to the post for you.
The file name does not matter.

1. Log in to https://openhrapp.com as Super Admin, and open the **Blog** or guides tab.
2. Click **Edit** on the post.
3. Click **Change Image** or **Upload Image**, and choose your file.
4. Click **Save**. The publish date does not change.

### Images inside articles: use Studio, with the exact file name

The article already points at these exact names, so you do not need to edit any article.

1. Convert your image to **WebP**, for example at https://squoosh.app. Aim for under 200 KB.
2. Rename it to the exact name given below, for example `1784697138541-s767kta.webp`. Renaming a PNG to
   `.webp` without converting it is not enough.
3. Open https://api.openhrapp.com → **Storage** → **content-images**.
4. Click **Upload files**. Upload to the **top level of the bucket**, not into a folder.

### Check

Open the blog post on the site, and reload it. To test one file, open this address with its name:

```
https://api.openhrapp.com/storage/v1/object/public/content-images/<file name>
```

| Problem | Fix |
|---|---|
| Image is still broken in an article | Check Step 1, then check that the file name is exact and at the top level of the bucket |
| Article shows an old image | Hard reload the page (Ctrl+Shift+R) |
| Upload fails with `413` | Make the file smaller, or add `client_max_body_size 50m;` under the gear icon of the proxy host |
| Studio says the file already exists | Delete the old file first, or choose to replace it |

---

## Work in this order

1. Run Step 1.
2. Do the 3 broken guide covers (Part C).
3. Do the blog posts (Part A), newest and most visited first.
4. Do the other guide covers (Part D), if you want them.

---

# Part A: Blog posts

## 1. The Complete Guide to OpenHR: Free Open Source HR Software That Actually Works

Page: `/blog/openhr-complete-guide`

**Note:** this article and `/blog/complete-guide-openhrapp` (post 5) cover the same content, so you can
use one set of images for both. Upload the same picture under each file name. Two near-identical articles
can also compete with each other in search, so consider unpublishing one of them.

**Cover** (Super Admin)

```
An all-in-one HR platform shown as a central hub with five connected modules orbiting it: a camera for selfie attendance, a calendar for leave, a star for performance reviews, a group of people for the employee directory, and a bar chart for reports. Wide horizontal composition.
```

**Image 1:** `1790682694841-4fzxj88.webp`, after "What Does OpenHRApp Actually Do? A Walkthrough of Every Feature"

```
An isometric HR dashboard floating slightly above a desk, with a blue sidebar and three widgets: attendance cards with green, amber and red badges, a list of pending leave requests, and an employee search bar. No people.
```

**Image 2:** `1790682719735-kvisswm.webp`, after "How to Get OpenHRApp Running (The Honest Version)"

```
Two connected panels: on the left, a dark terminal window with blank command lines and a green success check; on the right, a browser window showing a simple database dashboard with table shapes. A dotted line connects them. Developer tool look.
```

**Image 3:** `1790682754900-a2fac0v.webp`, after "Shifts, Holidays, and the Fiddly Scheduling Stuff"

```
A month calendar with color-coded shift blocks, blue for morning and slate for night, small amber markers for holidays, and a card below it with clock icons and toggle switches for shift settings. Organized scheduling interface.
```

## 2. OpenHRApp Reports and Analytics: Making Data-Driven HR Decisions

Page: `/blog/openhrapp-reports-analytics-guide`

**Cover** (Super Admin)

```
A clean analytics dashboard with a bar chart, an upward trend line and a donut chart in blue, teal and amber, with a cursor hovering over one bar and a small blank tooltip. Wide horizontal composition.
```

**Image 1:** `1784697138541-s767kta.webp`, after "The Report Types Available"

```
A reports screen with three tab shapes across the top and three summary cards below, each with an icon: a green check, a red cross and an amber clock, plus two small download buttons with arrow icons.
```

**Image 2:** `1784697163157-p9exses.webp`, after "CSV Export"

```
A spreadsheet grid flowing out of a dashboard into a downloaded file icon, with an arrow between them, and a simple stylized manager figure pointing at an upward trend chart. Conveys turning HR data into a decision.
```

## 3. Getting Started with OpenHRApp: A Step-by-Step Setup Guide

Page: `/blog/getting-started-with-openhrapp`

**Cover** (Super Admin)

```
An open laptop showing a friendly dashboard, surrounded by simple onboarding icons: a check mark, a user avatar, a gear and a small rocket. Welcoming and inviting. Wide horizontal composition.
```

**Image 1:** `1784524163121-3qqikjk.webp`, after "Step 1: Create Your Organization Account"

```
A straight-on mockup of a registration card with blank rounded input fields, one partly filled with a blinking cursor, and a blue button at the bottom. A small envelope icon with a check mark floats beside it, suggesting email verification.
```

**Image 2:** `1784524193176-xo39yo0.webp`, after "Step 3: Set Up Your Organization Structure"

```
A simple organization chart: one node at the top, four department nodes below it with different icons, and small round avatars under each department, joined by clean lines. Flat diagram.
```

**Image 3:** `1784524264766-psqz107.webp`, after "Step 7: Announce to Your Team"

```
A small diverse team of five stylized figures looking together at a large floating dashboard with glowing check marks, with a megaphone icon nearby. Celebratory but professional.
```

## 4. The Ultimate "No-Install" HRMS: High-Precision Attendance Without the App Store Headache

Page: `/blog/the-ultimate-no-install-hrms-high-precision-attendance-without-the-app-store-headache`

**Cover** (Super Admin)

```
A smartphone floating above an open palm, its screen showing a check-in button, a GPS pin and a camera icon. Thin lines radiate behind it to small icons: a shield, a cloud and a server rack. Conveys a powerful HR tool with nothing to download. Wide horizontal composition.
```

**Image 1:** `1784526256430-5zsgbqw.webp`, after "Why "No Install" Actually Matters"

```
Two generic smartphones side by side, each with a browser open and a highlighted menu pointing to a plus-shaped add icon. Below each phone, a home screen grid with one new blue app icon appearing. Instructional, helpful style. No brand marks.
```

**Image 2:** `1784526278749-ktci2mp.webp`, after "Daily Attendance Reports"

```
A smartphone mockup floating above a desk with soft shadows. The top half of the screen shows a camera frame with a simple face outline, and the bottom half shows a mini map with a blue GPS pin. A green badge with a check mark sits on the corner.
```

**Image 3:** `1784526339732-fjnqb8r.webp`, after "Two Ways to Get Started"

```
Two equal panels separated by a thin divider. Left panel: a dark terminal window above a server rack with a green badge. Right panel: a cloud above a browser window showing a blank login card with a blue button. Conveys choosing between self-hosted and ready-made.
```

## 5. The Complete Guide to OpenHRApp: Features, Setup, and Daily Workflows

Page: `/blog/complete-guide-openhrapp`

Same content as post 1. Reuse its images, or use these prompts for variety.

**Cover** (Super Admin)

```
A central rounded hub with five connected modules around it: selfie camera, calendar, star, people and bar chart, joined by soft lines over a light blue background. Conveys one platform for everything in HR. Wide horizontal composition.
```

**Image 1:** `1784468386564-dk6v3l4.webp`, after "What Does OpenHRApp Actually Do? A Walkthrough of Every Feature"

```
An isometric HR dashboard on a laptop with a blue sidebar, attendance cards with colored badges, a short list of leave requests and a search bar. Soft shadows, no people.
```

**Image 2:** `1784468417086-n0kqz1i.webp`, after "How to Get OpenHRApp Running (The Honest Version)"

```
A three-step path of connected rounded cards: a code bracket icon, a database cylinder and a browser with a green check mark, joined by arrows. Conveys setting up the app in a few steps.
```

**Image 3:** `1784468450781-t3yhkmg.webp`, after "Shifts, Holidays, and the Fiddly Scheduling Stuff"

```
A clock and a month calendar side by side, with colored shift bars across the days and small amber holiday flags. Clean scheduling interface.
```

## 6. Building a Performance Review Process That Actually Works

Page: `/blog/building-effective-performance-review-process`

**Cover** (Super Admin)

```
Two stylized people sitting across a table in a calm, constructive conversation. Between them floats a translucent card with a row of stars and blank lines. Collaborative, not confrontational. Wide horizontal composition.
```

**Image 1:** `1784469276485-0kaz0sv.webp`, after "Designing Your Review Cycle"

```
A circular flow of four connected stages with icons: a person (self-assessment), a clipboard (manager review), a balance scale (HR calibration) and a check mark (completed). Arrows go clockwise, and one stage is highlighted.
```

**Image 2:** `1784469320810-hq8rpsp.webp`, after "Making Reviews Data-Driven"

```
Five horizontal bars of increasing length, moving from red through amber to green, next to a small attendance calendar and a leave icon feeding into them. Dashboard widget style. Conveys ratings backed by real data.
```

## 7. How to Choose the Right HR Management Software for Your Small Business

Page: `/blog/choosing-hr-software-small-business`

**Cover** (Super Admin)

```
A small business owner at a desk thoughtfully comparing options on a laptop, with a notebook checklist and a cup of coffee beside them. Warm and professional. Wide horizontal composition.
```

**Image 1:** `1784368634078-ny98vir.webp`, after "Start With Your Actual Needs, Not the Feature List"

```
Three essential HR tasks as clean icons on one dashboard: a clock for attendance, a calendar with a check mark for leave, and a user card for the employee directory, joined by subtle dotted lines. Isometric.
```

**Image 2:** `1784368659412-umzd944.webp`, after "A Practical Migration Checklist"

```
A split scene: on the left, a messy desk with scattered papers, sticky notes and a calculator; on the right, a tidy laptop showing an organized dashboard with check marks. An arrow goes from left to right.
```

## 8. Why We Built OpenHRApp: The Story Behind the Open-Source HR Platform

Page: `/blog/why-we-built-openhrapp`

**Cover** (Super Admin)

```
A glowing lightbulb with a gear inside it, with small diverse stylized figures looking up at it, over a soft gradient from deep blue to teal. Inspiring founder-story mood. Wide horizontal composition.
```

**Image 1:** `1784367544240-koom7d7.webp`, after "The Problem We Set Out to Solve"

```
Three connected panels: a large price tag with a strike through it, a tangled maze turning into a straight line, and a padlock opening to reveal an open door. Conceptual and simple.
```

**Image 2:** `1784368064127-3d5d4sz.webp`, after "What Makes Us Different"

```
A winding path leading to a bright horizon, with milestone flags along it marked by icons: a globe, a puzzle piece, a bar chart and an open book. Warm glow, optimistic and community-minded.
```

## 9. 10 Common HR Compliance Mistakes and How to Avoid Them

Page: `/blog/hr-compliance-mistakes-to-avoid`

**Cover** (Super Admin)

```
A shield made of document pages with a check mark in its center, with small warning triangles bouncing off it. Authoritative and calm. Navy blue with gold accents. Wide horizontal composition.
```

**Image 1:** `1784550248473-kl3m2tb.webp`, at the start of the article

```
Ten small cards in two neat rows, each with one icon: document, clock, shield, balance scale, padlock, person, building, book, globe and certificate. Clean infographic.
```

**Image 2:** `1784550271791-zp5rs1z.webp`, after "10. Failing to Train Managers on Compliance"

```
A split scene: on the left, paper forms scattered across a cluttered desk; on the right, a calm digital dashboard with organized records and green check marks. Conveys moving from risk to confidence.
```

## 10. The Complete Guide to Employee Attendance Tracking

Page: `/blog/employee-attendance-tracking-guide`

**Cover** (Super Admin)

```
A smartphone showing a check-in screen with a camera frame, a clock icon and a GPS pin, with a finger about to tap a round blue button and a green check mark appearing. Wide horizontal composition.
```

**Image 1:** `1784550899462-hxyawns.webp`, after "The Evolution of Attendance Tracking"

```
A horizontal timeline of five stages: paper timesheet, spreadsheet on a monitor, fingerprint scanner, access card, and a smartphone with a selfie camera. The smartphone is highlighted with a soft blue glow.
```

**Image 2:** `1784550926021-e1kxdnd.webp`, after "Field and Off-Site Work"

```
A map with several GPS pins at different field sites, each linked by a dotted line to a dashboard showing a list of people with green, amber and red status dots. A stylized manager figure stands next to it.
```

## 11. Comparing OpenHRApp vs Commercial HRMS: An Honest Look

Page: `/blog/openhrapp-vs-commercial-hrms-comparison`

**Cover** (Super Admin)

```
Two cubes on a table: a transparent glass cube with an open padlock and small community avatars around it, and a polished metal cube with a price tag and a closed padlock. Neutral and informative, not biased. Wide horizontal composition.
```

**Image 1:** `1784868753552-abwub62.webp`, after "Feature Comparison"

```
A comparison grid with two columns and several rows with blank row labels. One column has mostly green check marks. The other has a mix of check marks, coin symbols and gray dashes. Clean and easy to scan.
```

**Image 2:** `1784868807483-b5kzb09.webp`, after "Total Cost Analysis"

```
Three horizontal bars with no labels: a very short green bar, a medium amber bar and a long red bar, each with a stack of coins at its end, growing with length. Simple, clear infographic.
```

**Image 3:** `1784868824286-5eryvlj.webp`, after "Making the Switch: Migration Considerations"

```
A simple decision flowchart: one rounded diamond at the top splitting into two paths that end at two different icons, an open padlock and a building, with a third path where both meet. Rounded shapes and clear arrows.
```

## 12. A Day in the Life: How HR Teams Use OpenHRApp to Save 10+ Hours Per Week

Page: `/blog/day-in-life-hr-teams-openhrapp`

**Cover** (Super Admin)

```
An HR professional at a tidy desk with a large organized dashboard, surrounded by small floating icons: attendance check mark, leave calendar, new user profile and report chart. A wall clock is visible. Warm and inviting. Wide horizontal composition.
```

**Image 1:** `1784867413855-rcjt11z.webp`, at the start of the article

```
A horizontal workday timeline from sunrise to sunset, with six task icons along it, each with a small clock: attendance check, leave approval, new hire, reports, review preparation and end-of-day check.
```

**Image 2:** `1784867448594-ld9wuzi.webp`, after "4:45 PM — End-of-Day Review"

```
A before and after scene: on the left, a stressed stylized person surrounded by spreadsheets, envelopes and sticky notes; on the right, the same person calm at a clean dashboard with a large green check mark and a small hourglass.
```

## 13. Leave Management Best Practices for Growing Teams

Page: `/blog/leave-management-best-practices`

**Cover** (Super Admin)

```
A large calendar with several days highlighted in blue and green, one day with a small airplane icon, and a check mark badge floating beside it. Wide horizontal composition.
```

**Image 1:** `1784552247962-0y51vp4.webp`, after "Start With a Clear Leave Policy"

```
Four neat cards in a row, each with one leave type icon: a beach umbrella, a first-aid cross, a coffee cup and a baby bottle, each with a small blank progress bar below. Organized dashboard style.
```

**Image 2:** `1784552276707-gqkia2e.webp`, after "Notification Best Practices"

```
A simple flow of rounded boxes with icons: person submitting a form, manager with a clipboard, a decision splitting into a green check and a red cross, then HR with a stamp. A small bell icon sits over each step to suggest notifications.
```

## 14. How Selfie-Based Attendance Works in OpenHRApp

Page: `/blog/how-selfie-attendance-works`

**Cover** (Super Admin)

```
A hand holding a smartphone showing a camera screen with a simple face outline guide. Small icons of a GPS pin, a clock and a check mark sit beside it. Wide horizontal composition.
```

**Image 1:** `1784605059436-ev2ilii.webp`, after "The Check-In Flow"

```
Four steps in a row joined by arrows: a phone, a camera, a camera with a face outline, and a green check mark badge. Color moves from blue to green to show progress. Clean infographic.
```

**Image 2:** `1784605095319-kwui953.webp`, after "The Audit Trail"

```
A vertical list of attendance record cards, each with a small round selfie placeholder, a clock icon, a map pin and a green check mark. A magnifying glass rests on one card. Conveys a clear audit record.
```

## 15. Employee Privacy in the Age of Workplace Surveillance

Page: `/blog/employee-privacy-workplace-surveillance`

**Cover** (Super Admin)

```
A balance scale in perfect balance, with a magnifying glass on one side and a shield with a keyhole on the other. Muted blue and slate. Thoughtful editorial style, neither alarming nor dismissive. Wide horizontal composition.
```

**Image 1:** `1784866616053-8jwm4jh.webp`, after "Where Is the Line?"

```
Two columns of icons. Left column, each with a green check mark: a selfie check-in, a single GPS pin and a log entry. Right column, each with a red cross: a continuous GPS trail, a keyboard with a counter, and a webcam.
```

**Image 2:** `1784866641944-qaeu6od.webp`, after "Building Trust Through Transparency"

```
A padlock made of clear glass, so the mechanism inside is visible, with a key shaped like a document. Conceptual, symbolizing security through transparency. Blue and white.
```

## 16. Remote Work and HR: Adapting Your Policies for a Distributed Workforce

Page: `/blog/remote-work-hr-policies`

**Cover** (Super Admin)

```
Stylized people working from different places: a home desk, a co-working space, a coffee shop and an office, linked by thin lines to one shared floating dashboard. Global and connected. Wide horizontal composition.
```

**Image 1:** `1784865946186-ymi0qvc.webp`, after "Attendance Tracking for Remote Teams"

```
A smartphone showing a check-in screen with a selfie frame and a GPS pin, set on a home office desk with a plant and a laptop in the background. Natural and relaxed.
```

**Image 2:** `1784865970941-p8p18al.webp`, after "Written Feedback Over Verbal"

```
A grid of six video call windows, each with a stylized team member in their own setting: bookshelves, plants, a cat. A chat bubble with blank lines overlaps one corner. Warm and human.
```

## 17. A Guide to OpenHRApp's Performance Review Module

Page: `/blog/openhrapp-performance-review-guide`

**Cover** (Super Admin)

```
A review dashboard with a rating card showing stars, a blank feedback area and a three-step progress indicator with the middle step highlighted. Blue with small green and amber accents. Wide horizontal composition.
```

**Image 1:** `1784607855664-j9cxhpm.webp`, after "Step 2: Create a Review Cycle"

```
A mockup of a form card with blank input fields, a dropdown arrow, a small date range calendar, a row of check boxes and a toggle switch in the on position. Rounded corners and subtle shadows.
```

**Image 2:** `1784607879910-z5h9y79.webp`, after "Step 4: Manager Evaluation"

```
A split screen: on the left, colored rating bars for an employee's self-assessment; on the right, a manager's form with star ratings and a blank feedback box. The panels sit side by side for comparison.
```

## 18. Managing Employee Leave with OpenHRApp

Page: `/blog/managing-leave-with-openhrapp`

**Cover** (Super Admin)

```
A leave dashboard with a calendar with colored date ranges, a rounded blue button and two balance cards with circular progress rings in blue and green. Wide horizontal composition.
```

**Image 1:** `1784630885926-85giyo3.webp`, after "For Employees: Applying for Leave"

```
Four small screens in a row joined by arrows: a dropdown list, a mini calendar with selected dates, a blank text box, and a blue button with a check mark. Friendly, easy-to-use look.
```

**Image 2:** `1784631036988-vj09wo6.webp`, after "Leave Reports"

```
A team calendar month view with colored horizontal bars across date ranges, each beside a small round avatar, and a small bar chart summary next to it. A manager avatar with a green check mark badge sits in the corner.
```

## 19. The Rise of Open-Source HR Software: Why It's the Future

Page: `/blog/rise-of-open-source-hr-software`

**Cover** (Super Admin)

```
A rising line graph made of code bracket symbols, climbing along a glowing path, with small open padlocks below it. Dark blue background with teal and gold accents. Abstract, optimistic and modern. Wide horizontal composition.
```

**Image 1:** `1784783678436-dsysiaq.webp`, after "The Cost Problem in HR Software"

```
Three vertical bars with no labels: a very short green bar with a small star above it, a tall amber bar and a very tall red bar, with small stacks of coins beside the taller ones. Easy to read at a glance.
```

**Image 2:** `1784783703603-crtshen.webp`, after "What to Expect in the Coming Years"

```
A balance scale: on one side, a locked box with a price tag; on the other, an open book surrounded by small community avatars. The scale tips slightly toward the open book. Conceptual and clean.
```

---

# Part B: Skipped on purpose

`/how-to-use/theme-customization` is not in this list. The guide is retired, and the site redirects it to
`/how-to-use/managing-profile-settings`, so it does not need an image.

---

# Part C: Guide covers that are broken now

These three guides point at a cover file that is not on the server. Do them first. Upload in Super Admin.

## Welcome to OpenHRApp — Your First Steps

Page: `/how-to-use/welcome-to-openhrapp`

```
A friendly open doorway with a welcome mat, leading to a simple dashboard, with small icons on either side: a person, a calendar and a check mark. Warm and inviting. Wide horizontal composition.
```

## How to Clock In and Out

Page: `/how-to-use/how-to-clock-in-and-out`

```
A smartphone with a camera frame and a GPS pin between two arrows, one pointing in and one pointing out of a simple office door, with a small clock above. Wide horizontal composition.
```

## Announcements — Viewing and Creating

Page: `/how-to-use/announcements-guide`

```
A large megaphone with blank message cards flying out of it toward a small group of stylized people, one card marked with an amber priority dot. Wide horizontal composition.
```

---

# Part D: Other guide covers (optional)

These 21 guides have never had a cover, and they work without one. Adding them gives the guides a more
finished look and better social previews. Upload in Super Admin.

## Getting Started

**Roles and Permissions in OpenHRApp** (`roles-and-permissions`)

```
Five stylized people in a row, each with a different badge, under a set of keys that open different doors. Conveys role-based access. Wide horizontal composition.
```

**Install OpenHRApp as an App (PWA) on Android and iOS** (`install-openhrapp-pwa`)

```
A generic smartphone home screen with a new blue app icon sliding into place from a browser window, with a small plus icon. No brand marks. Wide horizontal composition.
```

**Understanding the Dashboard** (`understanding-dashboard`)

```
A clean dashboard made of tidy widgets: colored stat cards, a small chart and a short list, with a sidebar on the left. Wide horizontal composition.
```

**Subscription and Upgrade Options** (`subscription-upgrade-options`)

```
Three simple plan cards side by side, each with a different icon: an hourglass, a banner and a star, with the middle card slightly raised. Wide horizontal composition.
```

## Attendance

**Understanding Your Attendance Logs** (`understanding-attendance-logs`)

```
A personal attendance list with one row per day, each with a clock icon and a colored status dot in green, amber or red, beside a small calendar. Wide horizontal composition.
```

**Attendance for Admins — Audit and Manual Entries** (`attendance-admin-audit`)

```
A magnifying glass over a table of attendance rows, with a pencil editing one row and a small plus icon for a new entry. Wide horizontal composition.
```

## Leave

**How to Apply for Leave** (`how-to-apply-for-leave`)

```
A calendar with a few selected days next to a form card with a blue submit button and a status path of three dots. Wide horizontal composition.
```

**Leave Approval — For Managers** (`leave-approval-for-managers`)

```
A stylized manager reviewing a request card, with a large green check button and a red cross button beside it. Wide horizontal composition.
```

**Leave Approval — For HR and Admins** (`leave-approval-for-hr`)

```
A stack of leave request cards passing through a final approval stamp, leaving as neatly filed records with green check marks. Wide horizontal composition.
```

**Understanding Leave Policies** (`understanding-leave-policies`)

```
A policy document next to a calendar with holidays marked, and balance rings showing used and remaining leave. Wide horizontal composition.
```

**Custom Leave Types and Special Leave** (`custom-leave-types`)

```
A row of leave type cards with different icons: a baby bottle, a coin, a half-filled circle and a plus sign for adding a new type. Wide horizontal composition.
```

## Employees

**Managing Employees — Adding and Editing Staff** (`managing-employees`)

```
A directory of employee cards with round avatars, with one new card being added with a plus icon and another being edited with a pencil. Wide horizontal composition.
```

## Organization

**Setting Up Your Organization** (`setting-up-organization`)

```
A building icon at the center, connected to smaller icons for departments, teams, shifts, a GPS location and a holiday calendar, with a gear nearby. Wide horizontal composition.
```

**Configuring Notification Settings** (`notification-settings`)

```
A settings panel with several toggle switches next to a bell and an envelope icon. Wide horizontal composition.
```

## Performance

**Performance Reviews — Employee Self-Assessment** (`performance-review-self-assessment`)

```
A stylized person at a laptop filling in a card with star ratings and a blank comment box, with a small mirror icon beside them. Wide horizontal composition.
```

**Performance Reviews — For Managers** (`performance-review-for-managers`)

```
A stylized manager comparing two cards side by side, an employee's star ratings and a blank feedback form. Wide horizontal composition.
```

**Performance Reviews — HR Calibration** (`performance-reviews-hr-calibration`)

```
A balance scale with rating cards on each side and a row of stars above it, next to a check mark. Conveys fair, consistent final ratings. Wide horizontal composition.
```

## Reports

**Generating Reports** (`generating-reports`)

```
A report document coming out of a dashboard, with a bar chart on it, and icons of a download arrow and an envelope beside it. Wide horizontal composition.
```

**Exporting Employee Data** (`exporting-employee-data`)

```
An employee directory list flowing along an arrow into two file icons, one a spreadsheet grid and one a document page. Wide horizontal composition.
```

## Settings

**Managing Your Profile and Settings** (`managing-profile-settings`)

```
A profile card with a round avatar and blank fields, next to a padlock for the password and a small sun and moon switch. Wide horizontal composition.
```

**Notifications — Bell Notifications and Admin Management** (`notifications-guide`)

```
A large bell with several small notification cards fanning out from it, one with a green check mark and one with an amber dot. Wide horizontal composition.
```

---

## Progress checklist

- [ ] Step 1: the SQL shows `still_on_old_address = 0`
- [ ] Part C: 3 broken guide covers
- [ ] Part A: 19 blog covers
- [ ] Part A: 43 images inside articles
- [ ] Part D: 21 optional guide covers
- [ ] Spot check on the live site, including a phone
