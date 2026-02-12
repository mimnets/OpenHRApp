# OpenHR Landing Page Implementation Guide

This document provides a comprehensive guide for implementing a professional landing page for OpenHR as a multi-organization HRM SaaS platform.

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Recommended Tech Stack](#2-recommended-tech-stack)
3. [Landing Page Structure](#3-landing-page-structure)
4. [Page Sections Design](#4-page-sections-design)
5. [Tutorial System](#5-tutorial-system)
6. [FAQ Section](#6-faq-section)
7. [PWA Standards & Best Practices](#7-pwa-standards--best-practices)
8. [SEO Optimization](#8-seo-optimization)
9. [Implementation Approach](#9-implementation-approach)
10. [Content Guidelines](#10-content-guidelines)

---

## 1. Overview & Architecture

### Current Setup
```
openhr.app/              → React SPA (Login/Dashboard)
├── /                    → Login Page
├── /#/dashboard         → Dashboard (after login)
└── /#/register          → Organization Registration
```

### Proposed Setup (Two Options)

#### Option A: Subdomain Approach (Recommended)
```
www.openhr.app/          → Landing Page (Static/SSR)
├── /                    → Hero + Features
├── /features            → Detailed Features
├── /pricing             → Pricing Plans
├── /tutorials           → Video/Text Tutorials
├── /faq                 → FAQ Section
├── /about               → About Us
├── /contact             → Contact Form
└── /blog                → Blog (optional)

app.openhr.app/          → Existing React App (Login/Dashboard)
├── /                    → Login Page
└── /register            → Registration
```

#### Option B: Path-Based Approach
```
openhr.app/
├── /                    → Landing Page
├── /features            → Features
├── /pricing             → Pricing
├── /tutorials           → Tutorials
├── /faq                 → FAQ
├── /app                 → Redirect to Login
├── /app/login           → Existing Login Page
└── /app/register        → Existing Registration
```

### Integration Points
- **Login Button** → Redirects to `app.openhr.app/` or `/app/login`
- **Register Button** → Redirects to `app.openhr.app/?register=true` or `/app/register`
- **Dashboard Link** → Redirects to `app.openhr.app/`

---

## 2. Recommended Tech Stack

### For Landing Page (Separate from App)

| Component | Recommendation | Reason |
|-----------|---------------|--------|
| **Framework** | Next.js 14+ or Astro | SSR/SSG for SEO, fast loading |
| **Styling** | Tailwind CSS | Consistent with existing app |
| **Animations** | Framer Motion | Smooth, professional animations |
| **Icons** | Lucide React | Match existing app icons |
| **Forms** | React Hook Form | Contact/newsletter forms |
| **CMS (optional)** | Contentful / Sanity | Manage blog/tutorials content |
| **Analytics** | Google Analytics 4 | Track conversions |
| **Hosting** | Vercel / Cloudflare Pages | Fast, global CDN |

### Why Separate Landing Page?
1. **SEO Optimization** - SSR/SSG for better search rankings
2. **Performance** - Faster initial load (no React app bundle)
3. **Independence** - Update landing without affecting app
4. **Marketing** - A/B testing, analytics without app complexity

---

## 3. Landing Page Structure

### Site Map
```
/
├── index.html                 # Hero + Overview
├── /features
│   ├── index.html            # All Features
│   ├── /attendance           # Attendance Management
│   ├── /leave                # Leave Management
│   ├── /employee             # Employee Directory
│   └── /reports              # Reports & Analytics
├── /pricing
│   └── index.html            # Pricing Plans
├── /tutorials
│   ├── index.html            # Tutorial Hub
│   ├── /getting-started      # Quick Start Guide
│   ├── /admin-guide          # Admin Tutorials
│   ├── /employee-guide       # Employee Tutorials
│   └── /video                # Video Tutorials
├── /faq
│   └── index.html            # FAQ Page
├── /about
│   └── index.html            # About Company
├── /contact
│   └── index.html            # Contact Form
├── /privacy
│   └── index.html            # Privacy Policy
├── /terms
│   └── index.html            # Terms of Service
└── /blog (optional)
    └── index.html            # Blog Posts
```

---

## 4. Page Sections Design

### 4.1 Homepage Sections

#### Hero Section
```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]                    Features  Pricing  Tutorials  FAQ    │
│                                                   [Login] [Register]
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     Modern HR Management                    ┌─────────────────┐ │
│     Made Simple                             │                 │ │
│                                             │  [App Preview]  │ │
│     Streamline attendance, leave,           │   Screenshot    │ │
│     and employee management for             │                 │ │
│     your entire organization.               └─────────────────┘ │
│                                                                 │
│     [Get Started Free]  [Watch Demo]                           │
│                                                                 │
│     ✓ 14-day free trial  ✓ No credit card  ✓ Setup in 5 min   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Features Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                    Everything You Need                          │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 📍       │  │ 📅       │  │ 👥       │  │ 📊       │       │
│  │Attendance│  │  Leave   │  │ Employee │  │ Reports  │       │
│  │Management│  │Management│  │Directory │  │Analytics │       │
│  │          │  │          │  │          │  │          │       │
│  │Selfie    │  │Apply,    │  │Complete  │  │Insights  │       │
│  │check-in, │  │approve,  │  │profiles, │  │& export  │       │
│  │GPS track │  │balance   │  │org chart │  │options   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### How It Works
```
┌─────────────────────────────────────────────────────────────────┐
│                    Get Started in 3 Steps                       │
│                                                                 │
│     ①                    ②                    ③                │
│  ┌──────┐             ┌──────┐             ┌──────┐            │
│  │ 📝   │  ───────►  │ 👤   │  ───────►  │ ✅   │            │
│  └──────┘             └──────┘             └──────┘            │
│  Register             Add Your             Start               │
│  Organization         Employees            Managing            │
│                                                                 │
│  Create your org      Invite team          Track attendance,   │
│  account in under     members via          manage leaves,      │
│  2 minutes            email                view reports        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Testimonials
```
┌─────────────────────────────────────────────────────────────────┐
│                 Trusted by Growing Teams                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ "OpenHR simplified our HR processes completely.         │   │
│  │  What used to take hours now takes minutes."            │   │
│  │                                                         │   │
│  │  — Sarah Johnson, HR Manager at TechCorp               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│        50+              1000+              99.9%               │
│   Organizations       Employees         Uptime                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### CTA Section
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              Ready to Transform Your HR?                        │
│                                                                 │
│     Start your 14-day free trial today. No credit card.        │
│                                                                 │
│                   [Start Free Trial]                            │
│                                                                 │
│              Or continue with [Ad-Supported Free Plan]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Footer
```
┌─────────────────────────────────────────────────────────────────┐
│  OpenHR                                                         │
│  Modern HR for Modern Teams                                     │
│                                                                 │
│  Product          Resources        Company        Legal         │
│  ─────────        ─────────        ─────────      ─────────    │
│  Features         Tutorials        About Us       Privacy       │
│  Pricing          FAQ              Contact        Terms         │
│  Changelog        Blog             Careers        Cookies       │
│  Roadmap          Help Center      Partners                     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  © 2024 OpenHR. All rights reserved.    [Twitter] [LinkedIn]   │
│                                                                 │
│  Install App: [Add to Home Screen - PWA]                        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Features Page Sections

Each feature page should include:
- Hero with feature name
- Problem it solves
- Key capabilities (bullet points)
- Screenshot/GIF demo
- Related features
- CTA to start trial

---

## 5. Tutorial System

### 5.1 Tutorial Categories

```
Tutorials Hub
├── Getting Started (5-10 min)
│   ├── Creating Your Organization
│   ├── First Login & Setup
│   ├── Adding Your First Employee
│   └── Installing PWA on Your Device
│
├── For Administrators
│   ├── Dashboard Overview
│   ├── Managing Employees
│   ├── Setting Up Departments & Teams
│   ├── Configuring Leave Policies
│   ├── Attendance Settings
│   ├── Generating Reports
│   └── Organization Settings
│
├── For Managers
│   ├── Approving Leave Requests
│   ├── Viewing Team Attendance
│   ├── Team Reports
│   └── Managing Direct Reports
│
├── For Employees
│   ├── Punching In/Out
│   ├── Taking Selfie Attendance
│   ├── Applying for Leave
│   ├── Viewing Leave Balance
│   ├── Updating Profile
│   └── Installing as App (PWA)
│
└── Video Tutorials
    ├── Quick Start (3 min)
    ├── Full Walkthrough (15 min)
    └── Feature-specific videos
```

### 5.2 Tutorial Page Template

```markdown
# Tutorial: [Title]

**Duration:** 5 minutes | **Level:** Beginner | **Role:** Admin

## Overview
Brief description of what this tutorial covers.

## Prerequisites
- What users need before starting

## Step-by-Step Guide

### Step 1: [Action]
Description with screenshot.
![Screenshot](image.png)

### Step 2: [Action]
Description with screenshot.

### Step 3: [Action]
Description with screenshot.

## Tips & Best Practices
- Tip 1
- Tip 2

## Common Issues
| Problem | Solution |
|---------|----------|
| Issue 1 | Fix 1 |

## Related Tutorials
- [Next Tutorial]
- [Related Feature]

## Need Help?
Contact support@openhr.app
```

### 5.3 Video Tutorial Structure

| Video | Duration | Content |
|-------|----------|---------|
| Quick Start | 3 min | Register → Add Employee → First Punch |
| Admin Complete Guide | 15 min | Full admin walkthrough |
| Employee Guide | 5 min | Daily usage for employees |
| Leave Management | 5 min | Apply, approve, balance |
| Reports Deep Dive | 8 min | All report features |
| PWA Installation | 2 min | Install on iOS/Android/Desktop |

---

## 6. FAQ Section

### 6.1 FAQ Categories & Content

#### General Questions

**Q: What is OpenHR?**
> OpenHR is a modern, cloud-based Human Resource Management System designed for small to medium businesses. It helps organizations manage employee attendance, leave requests, and HR operations efficiently.

**Q: Is OpenHR free to use?**
> OpenHR offers a 14-day free trial with full features. After that, you can choose to:
> - Continue with our Ad-Supported free plan
> - Support the project with a donation for an ad-free experience
> - Request a trial extension if you need more time to evaluate

**Q: Do I need to install any software?**
> No! OpenHR is a Progressive Web App (PWA) that works in your browser. You can also "install" it on your phone or computer for an app-like experience without downloading from any app store.

**Q: Is my data secure?**
> Yes. We use industry-standard encryption, secure authentication, and your data is stored on protected cloud servers. Each organization's data is completely isolated from others.

#### Account & Setup

**Q: How do I register my organization?**
> Click "Get Started" on our homepage, fill in your organization name, admin details, and you'll receive a verification email. Verify your email and you're ready to go!

**Q: Can I have multiple admins?**
> Yes! You can assign Admin or HR roles to multiple users who can then manage employees, approve leaves, and access reports.

**Q: How do I add employees to my organization?**
> As an Admin:
> 1. Go to Organization → Employee Directory
> 2. Click "Add Employee"
> 3. Fill in employee details
> 4. They'll receive an email to set their password

**Q: Can employees register themselves?**
> No, for security reasons. Admins must add employees to ensure only authorized personnel access your organization's data.

#### Attendance

**Q: How does selfie attendance work?**
> Employees can punch in/out by taking a selfie. The system captures:
> - Timestamp
> - Location (GPS)
> - Photo for verification
> This prevents buddy punching and ensures authentic attendance.

**Q: Can attendance work offline?**
> Currently, an internet connection is required for attendance tracking to ensure real-time data accuracy and GPS verification.

**Q: What if an employee forgets to punch out?**
> The system can be configured to auto-close sessions at a specified time (e.g., 11:55 PM). Admins can also manually edit attendance records if needed.

**Q: Does it track GPS location?**
> Yes, the system captures GPS coordinates during punch in/out. This feature can be enabled/disabled in organization settings based on your requirements.

#### Leave Management

**Q: What types of leave does OpenHR support?**
> By default: Annual Leave, Sick Leave, and Casual Leave. Admins can configure leave policies, balances, and add custom leave types.

**Q: How does the leave approval process work?**
> 1. Employee submits leave request
> 2. Request goes to their Manager (or HR if no manager)
> 3. Manager approves/rejects
> 4. Employee is notified
> 5. Leave balance is automatically updated

**Q: Can I see my remaining leave balance?**
> Yes! Employees can view their leave balance on the dashboard and when applying for leave. The balance is updated in real-time.

**Q: What happens if I apply for leave but don't have enough balance?**
> The system will warn you if you don't have sufficient balance. Your manager can still approve it as unpaid leave or special circumstances.

#### PWA & Mobile

**Q: How do I install OpenHR on my phone?**
> **For iPhone/iPad (Safari):**
> 1. Open OpenHR in Safari
> 2. Tap the Share button (square with arrow)
> 3. Scroll down and tap "Add to Home Screen"
> 4. Tap "Add"
>
> **For Android (Chrome):**
> 1. Open OpenHR in Chrome
> 2. Tap the menu (three dots)
> 3. Tap "Add to Home screen" or "Install app"
> 4. Tap "Add"

**Q: Is there an iOS or Android app?**
> OpenHR is a Progressive Web App (PWA), which means it works like a native app when installed from your browser. This approach allows us to:
> - Provide instant updates without app store delays
> - Offer the same experience across all devices
> - Save storage space on your device

**Q: Does the PWA work offline?**
> Basic features like viewing cached data work offline. However, actions like punching in/out, applying for leave, and real-time data require an internet connection.

**Q: Will I get notifications?**
> Yes! When you install the PWA and grant notification permissions, you'll receive alerts for:
> - Leave request approvals/rejections
> - Pending approvals (for managers)
> - Important announcements

#### Subscription & Pricing

**Q: What happens after my 14-day trial?**
> After the trial, your account enters read-only mode. You can still view all data but cannot create new records. To continue:
> - Activate Ad-Supported mode (free with ads)
> - Make a donation for ad-free access
> - Contact us for enterprise options

**Q: What is Ad-Supported mode?**
> It's our free tier where you get full access to all features, but small banner ads are displayed in the app. Revenue from these ads helps us maintain and improve OpenHR.

**Q: How much does it cost?**
> OpenHR is community-supported. Suggested donations:
> - $5 - 3 months ad-free
> - $10 - 6 months ad-free
> - $20 - 12 months ad-free
> - $50 - Lifetime ad-free

**Q: Can I export my data?**
> Yes! You can export attendance records, leave reports, and employee data as Excel/CSV files from the Reports section.

#### Technical & Support

**Q: What browsers are supported?**
> OpenHR works best on modern browsers:
> - Chrome (recommended)
> - Firefox
> - Safari
> - Edge
> - Opera

**Q: How do I contact support?**
> - Email: support@openhr.app
> - GitHub Issues: [github.com/openhr/issues](https://github.com/openhr/issues)
> - Documentation: [docs.openhr.app](https://docs.openhr.app)

**Q: Is OpenHR open source?**
> Yes! OpenHR is open-source software. You can view the source code, contribute, or self-host on your own servers.

**Q: Can I self-host OpenHR?**
> Yes! OpenHR can be self-hosted using:
> - Frontend: Any static hosting (Vercel, Netlify, etc.)
> - Backend: PocketBase on your own server
> See our GitHub repository for self-hosting instructions.

### 6.2 FAQ Page Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frequently Asked Questions                   │
│                                                                 │
│  [Search FAQs...]                                               │
│                                                                 │
│  Categories:  [All] [General] [Attendance] [Leave] [PWA] [Billing]
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ▼ What is OpenHR?                                             │
│    OpenHR is a modern, cloud-based Human Resource...           │
│                                                                 │
│  ► Is OpenHR free to use?                                      │
│                                                                 │
│  ► How do I install OpenHR on my phone?                        │
│                                                                 │
│  ► What browsers are supported?                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Can't find your answer?                                        │
│  [Contact Support]  [Check Tutorials]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. PWA Standards & Best Practices

### 7.1 Current PWA Status

OpenHR already has PWA support. Here's how to ensure it meets standards:

### 7.2 PWA Checklist

#### Manifest File (`manifest.json`)
```json
{
  "name": "OpenHR - HR Management System",
  "short_name": "OpenHR",
  "description": "Modern HR management for attendance, leave, and employee management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Dashboard"
    },
    {
      "src": "/screenshots/mobile-dashboard.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Mobile Dashboard"
    }
  ],
  "categories": ["business", "productivity"],
  "shortcuts": [
    {
      "name": "Punch In",
      "url": "/#/attendance",
      "description": "Quick punch in/out"
    },
    {
      "name": "Apply Leave",
      "url": "/#/leave",
      "description": "Apply for leave"
    }
  ]
}
```

#### Service Worker Features
- **Cache Strategy**: Cache-first for static assets, network-first for API
- **Offline Page**: Show friendly offline message
- **Background Sync**: Queue attendance punches when offline (sync when online)
- **Push Notifications**: Leave approvals, reminders

#### Install Prompts
Add install prompt UI in the app:
```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📱 Install OpenHR for quick access                       │   │
│  │    Add to your home screen for app-like experience       │   │
│  │                                                          │   │
│  │                            [Not Now]  [Install]          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 PWA Installation Instructions (For Tutorials)

#### iOS (Safari)
1. Open Safari and go to openhr.app
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name it "OpenHR" and tap "Add"
5. Find OpenHR on your home screen

#### Android (Chrome)
1. Open Chrome and go to openhr.app
2. Tap the menu (⋮) button
3. Tap "Add to Home screen" or "Install app"
4. Tap "Add" or "Install"
5. Find OpenHR on your home screen

#### Desktop (Chrome/Edge)
1. Open openhr.app in Chrome or Edge
2. Click the install icon in the address bar (⊕)
3. Or click menu → "Install OpenHR..."
4. Click "Install"
5. OpenHR will open as a standalone app

### 7.4 PWA Best Practices for OpenHR

| Aspect | Recommendation |
|--------|----------------|
| **Loading** | Show skeleton screens while loading |
| **Offline** | Cache static assets, show offline message for data |
| **Updates** | Prompt user when new version available |
| **Icons** | Provide all sizes, including maskable icons |
| **Splash** | Configure splash screen colors |
| **Orientation** | Support both portrait and landscape |
| **Touch** | 48x48px minimum touch targets |
| **Performance** | Lighthouse score > 90 |

---

## 8. SEO Optimization

### 8.1 Meta Tags for Landing Page

```html
<!-- Primary Meta Tags -->
<title>OpenHR - Modern HR Management System | Attendance & Leave Management</title>
<meta name="title" content="OpenHR - Modern HR Management System">
<meta name="description" content="Free HR management software for small businesses. Track attendance with selfies, manage leave requests, and streamline your HR operations. Start free trial today.">
<meta name="keywords" content="HR software, attendance management, leave management, employee management, HRM, human resource management, free HR system, PWA HR app">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://openhr.app/">
<meta property="og:title" content="OpenHR - Modern HR Management System">
<meta property="og:description" content="Free HR management software for small businesses. Track attendance, manage leaves, streamline HR.">
<meta property="og:image" content="https://openhr.app/og-image.png">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://openhr.app/">
<meta property="twitter:title" content="OpenHR - Modern HR Management System">
<meta property="twitter:description" content="Free HR management software for small businesses.">
<meta property="twitter:image" content="https://openhr.app/twitter-image.png">

<!-- Canonical -->
<link rel="canonical" href="https://openhr.app/">
```

### 8.2 Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "OpenHR",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "150"
  }
}
```

### 8.3 Page Title Formula

| Page | Title Format |
|------|--------------|
| Home | OpenHR - Modern HR Management System |
| Features | HR Features - Attendance, Leave & More | OpenHR |
| Pricing | Pricing Plans - Free & Premium | OpenHR |
| Tutorials | Learn OpenHR - Tutorials & Guides |
| FAQ | Help & FAQ | OpenHR |

---

## 9. Implementation Approach

### 9.1 Phase 1: Landing Page (Week 1-2)

1. **Setup Project**
   ```bash
   npx create-next-app@latest openhr-landing --typescript --tailwind
   cd openhr-landing
   npm install framer-motion lucide-react
   ```

2. **Create Pages**
   - Homepage with all sections
   - Features page
   - Pricing page
   - Contact page

3. **Navigation Links**
   ```javascript
   // Login button
   <a href="https://app.openhr.app" className="btn-primary">
     Login
   </a>

   // Register button
   <a href="https://app.openhr.app?register=true" className="btn-secondary">
     Start Free Trial
   </a>
   ```

4. **Deploy**
   - Deploy to Vercel/Cloudflare
   - Configure subdomain (www.openhr.app)

### 9.2 Phase 2: Tutorials (Week 3)

1. Create tutorial content structure
2. Write getting started guides
3. Record video tutorials (optional)
4. Add search functionality

### 9.3 Phase 3: FAQ & Polish (Week 4)

1. Implement FAQ page with search
2. Add analytics tracking
3. Performance optimization
4. SEO final review

### 9.4 Deployment Architecture

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (DNS + CDN)   │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ www.openhr.app│ │ app.openhr.app│ │ api.openhr.app│
    │               │ │               │ │               │
    │   Vercel      │ │   Vercel      │ │  PocketBase   │
    │ (Next.js SSG) │ │ (React SPA)   │ │   (Docker)    │
    │               │ │               │ │               │
    │ Landing Page  │ │ Main App      │ │  Backend API  │
    └───────────────┘ └───────────────┘ └───────────────┘
```

---

## 10. Content Guidelines

### 10.1 Brand Voice

| Attribute | Description |
|-----------|-------------|
| **Tone** | Professional yet friendly, approachable |
| **Language** | Simple, jargon-free, action-oriented |
| **Personality** | Helpful, modern, trustworthy |

### 10.2 Writing Guidelines

- Use active voice: "Manage attendance" not "Attendance is managed"
- Keep sentences short (15-20 words max)
- Use bullet points for lists
- Include CTAs in every section
- Address the reader directly ("You can...")

### 10.3 Visual Guidelines

| Element | Specification |
|---------|---------------|
| **Primary Color** | #4F46E5 (Indigo) |
| **Secondary** | #10B981 (Emerald) |
| **Background** | #F8FAFC (Light gray) |
| **Text** | #1E293B (Dark slate) |
| **Font** | Inter or System UI |
| **Border Radius** | 12-24px (rounded) |
| **Shadows** | Soft, subtle shadows |

### 10.4 Screenshot Guidelines

- Use consistent browser frame
- Show realistic but anonymized data
- Highlight key features with annotations
- Provide both desktop and mobile views
- Optimize images (WebP format, lazy loading)

---

## Quick Start Checklist

- [ ] Choose architecture (subdomain vs path-based)
- [ ] Set up Next.js/Astro project
- [ ] Design and implement homepage
- [ ] Create features pages
- [ ] Write tutorial content
- [ ] Compile FAQ answers
- [ ] Configure PWA manifest properly
- [ ] Set up analytics
- [ ] Implement SEO tags
- [ ] Test on multiple devices
- [ ] Deploy and configure DNS
- [ ] Set up redirects (login/register buttons)

---

## Resources

- **UI Inspiration**: Vercel, Linear, Notion landing pages
- **Icons**: Lucide (https://lucide.dev)
- **Illustrations**: unDraw (https://undraw.co)
- **Screenshots**: Use real app with demo data
- **Videos**: Loom or OBS for recording

---

*Last Updated: February 2026*
*Version: 1.0*
