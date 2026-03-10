# The Complete Guide to OpenHR: Free Open Source HR Software That Actually Works

Managing human resources shouldn't require an enterprise budget. Yet most HR software either costs a fortune or feels like it was built in 2005. That's exactly the gap OpenHR was designed to fill.

OpenHR is a free, open source HR management system built for growing organizations — particularly those with 100 to 500 employees who need proper attendance tracking, leave management, and performance reviews without the overhead of heavyweight enterprise tools. If you've been searching for a self-hosted HR solution that respects your data privacy and doesn't lock you into monthly subscriptions, this guide walks you through everything OpenHR offers, from initial setup to daily operations.

---

## What Makes OpenHR Different from Other HR Tools?

There's no shortage of HR management software out there. So why would you choose OpenHR over the dozens of alternatives?

The honest answer comes down to three things: simplicity, ownership, and cost.

**Simplicity.** Most open source HRMS platforms require you to spin up Docker containers, configure PostgreSQL databases, set up Redis caches, and manage a dozen environment variables before you can even see a login screen. OpenHR uses PocketBase as its backend — a single executable file that bundles your database, authentication, and API into one process. No database clusters. No Docker compose files. No DevOps headaches. You download one file, run it, and your backend is ready.

**Ownership.** Your employee data — attendance records, personal information, performance reviews — stays on your server. OpenHR is fully self-hosted. There's no third-party cloud service sitting between you and your data. For organizations in industries with strict data regulations, or simply for those who prefer knowing exactly where their data lives, this matters.

**Cost.** OpenHR is genuinely free. Not "free for 5 users" or "free but missing the features you actually need." The entire platform — attendance tracking, leave management, performance reviews, employee directory, reports — is available without paying anything. There's an optional ad-supported mode for organizations that want to keep using it beyond the trial period without paying, and there are affordable donation tiers for those who want to support development and go ad-free.

---

## Core Features: What Can You Actually Do with OpenHR?

Let's walk through the features that make up the day-to-day experience of using OpenHR.

### Biometric Attendance Tracking with GPS Verification

This is probably the feature that sets OpenHR apart the most. Employee attendance isn't just a timestamp in a spreadsheet — it's a verified record that includes a selfie and GPS coordinates.

Here's how it works in practice: an employee opens the attendance screen on their phone or computer. The app activates their front-facing camera and starts detecting their GPS location in the background. They see a live camera feed with their current location displayed as an overlay. When they're ready, they tap "Check In" and the system captures their selfie, records their GPS coordinates, and logs the timestamp.

This approach solves several real problems. Buddy punching — where one employee clocks in for another — becomes virtually impossible. Location fraud is eliminated because the system verifies GPS coordinates against predefined office locations. And there's a permanent audit trail for every single attendance record, which is invaluable during compliance reviews.

The system supports two duty modes: **Office** for standard workplace attendance, and **Factory/Field** for employees working at external locations. Factory mode requires mandatory remarks, so workers must specify which site they're at and what they're doing. This is particularly useful for organizations with field teams, construction crews, or multi-site operations.

For offices that define specific locations, OpenHR supports **GPS geofencing**. You set up your office locations with latitude, longitude, and a radius in meters. When an employee checks in, the system automatically matches their coordinates against these geofences. If they're within range, the office name appears on their attendance record. If they're outside all defined zones, the system falls back to reverse geocoding and records a human-readable street address instead.

One thoughtful detail: the system includes an auto-close feature. If an employee forgets to clock out at the end of the day, the system automatically closes their session based on the configured auto-close time. No more phantom 24-hour shifts cluttering up your reports.

### Intelligent Leave Management

Leave management in OpenHR follows a multi-tier approval workflow that mirrors how most organizations actually handle leave requests.

When an employee applies for leave, they select the leave type — Annual, Casual, Sick, Maternity, Paternity, Earned, or Unpaid — choose their dates, and submit a reason. The request then flows through an approval pipeline: Employee submits, the Line Manager reviews and approves (or rejects), and then HR gives final approval and documentation.

What makes this practical rather than theoretical is the configurability. Different departments can have different approval routes. Some departments might skip the manager step entirely and go straight to HR. Others might require an additional level of approval. You configure this per-department in the Organization settings, so it adapts to how your company actually works rather than forcing you into a rigid workflow.

Leave balances are tracked automatically. When you set up the system, you define default leave quotas by type — say 15 days of annual leave, 10 days of sick leave, and 7 days of casual leave per year. These defaults apply to everyone, but you can override them per employee for special cases. As employees take leave and requests are approved, balances update in real time.

Every step in the leave process triggers notifications. The employee gets notified when their manager acts on the request. The manager gets notified when new requests come in. HR gets notified when requests are ready for final approval. These notifications arrive both as in-app bell notifications and as email alerts, so nothing falls through the cracks.

### Performance Reviews

Performance reviews in OpenHR follow a structured three-step pipeline: self-assessment, manager evaluation, and HR finalization.

It starts with the HR team or Admin creating a review cycle — defining the review period, deadlines, and which competencies will be evaluated. The system comes with sensible default competencies like Agility, Collaboration, Customer Focus, Developing Others, Global Mindset, and Innovation Mindset, but you can customize these to match your organization's values and evaluation criteria.

Once a cycle opens, employees complete their self-assessments. They rate themselves on each competency using a 1-to-5 scale (Needs Significant Improvement through Outstanding) and provide comments explaining their ratings. Then their manager reviews the self-assessment, adds their own ratings and observations, and submits their evaluation. Finally, HR reviews both perspectives, adds an overall rating, and finalizes the review.

The system automatically pulls in attendance and leave summaries for the review period, so managers and HR have concrete data to reference alongside the qualitative assessments. No more digging through separate reports to figure out how many days an employee was late or how much leave they took during the review period.

### Employee Directory and Organization Structure

Setting up your organization in OpenHR is straightforward. You define your departments, designations (job titles), and team structures. Then you add employees and assign them to departments, give them designations, and place them in teams with designated team leaders.

The system supports five roles with different access levels:

- **Admin** has full organizational visibility and configuration access
- **HR** can manage all employee data, approve leaves, and finalize reviews
- **Manager** sees their team members' attendance, leave requests, and reviews
- **Team Lead** has visibility over their direct reports only
- **Employee** can only see their own data

This role-based access control ensures that sensitive information stays appropriately scoped. A manager in Engineering can't snoop on the Finance department's attendance records. An employee can view their own team's directory but can't access other teams' data.

### Announcements and Notifications

When you need to communicate something to your entire organization — or just specific roles — the announcement system handles it cleanly. You create an announcement with a title, content, and priority level (normal or urgent). You can target it to specific roles: maybe only managers need to see it, or maybe it's for everyone. You can set an expiry date so time-sensitive announcements automatically disappear when they're no longer relevant.

The notification system ties everything together. A bell icon in the app header shows your unread count. Clicking it reveals notifications grouped by type: announcements, leave updates, attendance alerts, review notifications, and system messages. Each notification type has its own icon and color for quick visual scanning.

You can configure notification preferences per organization — choosing which types of notifications generate emails, whether emails go out immediately or as daily/weekly digests, and even setting quiet hours when no email notifications are sent.

### Reports and Analytics

For HR teams and administrators, OpenHR provides attendance summaries and leave reports that can be exported for payroll integration. You can pull reports for specific date ranges, filter by department or team, and export the data in formats suitable for your payroll system.

---

## Getting Started: Setting Up OpenHR Step by Step

### Step 1: Set Up PocketBase (Your Backend)

PocketBase is the engine that powers OpenHR's backend. Setting it up takes about two minutes.

1. Visit [pocketbase.io](https://pocketbase.io) and download the binary for your operating system.
2. Extract the file and run it: `./pocketbase serve`
3. PocketBase will start and give you an admin URL (typically `http://127.0.0.1:8090/_/`).
4. Open the admin URL, create your first admin account.
5. Copy the PocketBase hook files from the `Others/pb_hooks/` folder in the OpenHR repository into your PocketBase's `pb_hooks/` directory. These hooks handle email notifications, automated workflows, and background processing.

That's your entire backend setup. One file, one command.

### Step 2: Install and Run OpenHR (The Frontend)

```bash
git clone https://github.com/openhr/openhr.git
cd openhr
npm install
npm run dev
```

This starts the development server on `http://localhost:3000`. For production, run `npm run build` and deploy the `dist/` folder to any static hosting service — Vercel, Netlify, or even a simple Nginx server.

### Step 3: Connect to PocketBase

When you first open OpenHR, the app detects that no PocketBase connection has been configured. It'll present a setup screen where you enter your PocketBase URL. Type in your PocketBase server address, and the app connects and verifies the connection.

### Step 4: Register Your Organization

Click "Get Started Free" to register. You'll fill in:

- **Organization name** — your company name
- **Country** — selected from a list of 250+ countries
- **Logo** — optional, auto-converted to WebP for optimal performance
- **Address** — your company's address
- **Your name, email, and password** — for the admin account

After submitting, you'll receive a verification email. Click the link to verify your account, then log in. You're the Admin now — the first user with full system access.

### Step 5: Configure Your Organization

Before inviting employees, take a few minutes to set up the organization structure. Navigate to the Organization page where you'll find tabs for:

1. **Structure** — Add your departments (Engineering, Marketing, HR, etc.) and designations (Senior Developer, HR Manager, etc.)
2. **Teams** — Create teams, assign leaders, and associate them with departments
3. **Placement** — Set up your office locations with GPS coordinates for geofencing
4. **Shifts** — Define work shifts with start/end times, grace periods, and working days
5. **Workflow** — Configure leave approval routes per department
6. **Leaves** — Set default leave balances by type
7. **Holidays** — Add your national and company holidays to the calendar
8. **Notifications** — Configure which events trigger email notifications
9. **System** — Set timezone, currency, date format, and other company-wide settings

### Step 6: Add Employees

With your structure in place, start adding employees through the Employee Directory. Each employee gets assigned a department, designation, role, and optionally a team and line manager. They'll receive login credentials to access the system.

---

## Using OpenHR Day to Day

### For Employees

The daily routine is simple. Open the app, tap the attendance shortcut on your dashboard, and you'll see the attendance screen with your camera feed and GPS location. Tap "Check In" when you arrive and "Check Out" when you leave.

Need to take leave? Go to the Leave section, tap "Apply for Leave," select your leave type and dates, write a brief reason, and submit. You'll see the request status update in real time as your manager and HR process it.

During review periods, you'll receive a notification to complete your self-assessment. Rate yourself on each competency, add your comments, and submit. You can track the review progress as it moves through the manager evaluation and HR finalization stages.

### For Managers

Your dashboard shows your team's status at a glance. You can see who's checked in today, pending leave requests that need your approval, and any active review cycles.

The attendance audit section lets you review your team's attendance history — check for patterns, verify locations, and ensure compliance. When leave requests come in, you get a notification and can approve or reject directly from the app with optional comments.

During review cycles, you'll evaluate each team member's self-assessment, add your own ratings, and submit your evaluations to HR.

### For HR and Administrators

You have the full picture. The admin dashboard shows organization-wide statistics, and you can drill down into any department or team. You manage the leave approval workflow's final stage, finalize performance reviews, configure the system, and generate reports.

The reports section lets you pull attendance summaries and leave reports for any date range, filter by department, and export data for payroll processing. The announcements system lets you communicate with the entire organization or targeted role groups.

---

## Mobile Access: PWA and Android App

OpenHR works beautifully on mobile devices without requiring an app store download. It's built as a Progressive Web App (PWA), which means you can install it directly to your phone's home screen from your browser.

**On Android:** Open OpenHR in Chrome, tap the menu button, and select "Install App" or "Add to Home Screen." Alternatively, you can download the native Android APK directly from the website for a fully native experience.

**On iPhone/iPad:** Open OpenHR in Safari, tap the Share button, and select "Add to Home Screen." The app will appear on your home screen just like a native app.

Once installed, the PWA loads instantly, works with cached data when your connection is spotty, and sends you notifications just like a native app. The camera and GPS features work seamlessly in PWA mode — which is essential for the selfie-based attendance system.

For organizations that prefer distributing a traditional Android app, the project includes Capacitor v8 configuration. Running a few build commands produces a standard APK file that can be distributed internally or through your organization's MDM solution.

---

## Shifts, Holidays, and Scheduling

OpenHR's shift management handles the reality that not every employee works the same hours. You can define multiple shifts — Morning, Afternoon, Night, or whatever your organization needs — each with its own start time, end time, and grace periods.

Grace periods are particularly practical. You set a "late grace period" (say, 5 minutes) so employees who clock in at 9:03 aren't flagged as late. Similarly, an "early out grace period" lets employees leave a few minutes before the official end time without it counting against them. The "earliest check-in time" prevents employees from gaming the system by clocking in at 4 AM for a 9 AM shift.

For temporary schedule changes — Ramadan shifts, holiday season adjustments, or individual accommodations — the shift override system lets you assign different shifts to specific employees for a date range, without modifying their permanent shift assignment.

The holiday calendar centralizes all your non-working days. You can categorize holidays as National, Festival, or Islamic (or define your own types), mark which ones are government-mandated, and the system automatically accounts for them in attendance calculations and leave processing.

---

## Pricing and Sustainability

OpenHR takes a refreshingly honest approach to pricing. The platform is free to use with a 14-day trial that gives you full access to every feature. After the trial, you have three options:

**Free with Ads.** Choose the ad-supported plan and keep using every feature at no cost. Small banner ads appear in the sidebar and dashboard areas, but never during attendance punch — because interrupting an employee's clock-in with an ad would be poor design.

**Donation Tiers.** If you want to go ad-free and support the project's development, donation tiers range from $5 for three months to $50 for lifetime access. These are processed through Ko-fi, Buy Me a Coffee, or PayPal.

**Trial Extension.** If you need more time to evaluate, you can request a trial extension of 7, 14, or 30 days with a reason — whether you're still setting up data, waiting for budget approval, or training your team.

This model means OpenHR remains sustainable without forcing organizations into expensive monthly subscriptions. For non-profits, educational institutions, and startups watching every dollar, the ad-supported option means genuinely free HR software without compromises on features.

---

## Security and Privacy Considerations

Because OpenHR is self-hosted, your security posture is largely in your hands — which is both a responsibility and an advantage.

All employee data, including selfies and GPS coordinates, is stored in your PocketBase instance on your server. Nothing is transmitted to third-party services except for reverse geocoding (which uses OpenStreetMap's free Nominatim API to convert GPS coordinates into street addresses).

Role-based access control ensures that data visibility is appropriately scoped. API rules on every PocketBase collection enforce that employees can only see their own records, managers can only see their team's data, and only admins and HR have organization-wide access.

Images uploaded to the system — selfies, avatars, logos — are automatically converted to WebP format, which reduces file sizes significantly without visible quality loss. This is a practical consideration for organizations with hundreds of daily attendance records, each with an attached selfie.

---

## Who Should Use OpenHR?

OpenHR hits a sweet spot for a specific type of organization. You'll get the most value from it if you:

- Have **100 to 500 employees** and need structured HR processes but can't justify enterprise HR software costs
- Want **biometric attendance verification** to prevent buddy punching and ensure location compliance
- Need **multi-site support** with GPS geofencing for offices, factories, and field locations
- Prefer **self-hosted solutions** where you control your data
- Want a **modern, mobile-friendly** experience rather than a legacy web app
- Need **configurable workflows** that adapt to your organization's approval processes rather than forcing you into a rigid structure

It's particularly well-suited for manufacturing companies with both office and factory workers, organizations with field teams who need location-verified attendance, and growing startups that need to professionalize their HR processes without the cost of enterprise solutions.

---

## Final Thoughts

OpenHR isn't trying to be everything to everyone. It doesn't have payroll processing, applicant tracking, or learning management built in. What it does — attendance tracking, leave management, performance reviews, and organizational tools — it does thoughtfully, with attention to the practical details that matter in daily use.

The combination of biometric verification, GPS geofencing, configurable workflows, and genuine self-hosting makes it a compelling option for organizations that have outgrown spreadsheets but aren't ready for (or don't want) the complexity and cost of enterprise HR platforms.

If you want to try it out, registration takes less than two minutes, and you'll have a fully functional HR system running before your coffee gets cold. Visit [openhrapp.com](https://openhrapp.com) to get started.

---

*OpenHR is open source software licensed under the MIT License. Contributions, bug reports, and feature suggestions are welcome on [GitHub](https://github.com/openhr/openhr).*
