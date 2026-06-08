# Historical Implementation Records — Feature Build Summaries

These documents described implementation details for features that are now built and stable.
Consolidated here for historical reference.

---

## What existed (files now consolidated and deleted)

| File | Size | Topic |
|------|------|-------|
| `ARCHITECTURE.md` | 4KB | Architecture overview |
| `BACKEND_CHANGES_SUMMARY.md` | 7KB | Backend changes |
| `BLOG_SETUP.md` | 5KB | Blog CMS setup |
| `IMPLEMENTATION_SUMMARY.md` | 13KB | General implementation |
| `LANDING_PAGE_IMPLEMENTATION.md` | 36KB | Landing page |
| `MONETIZATION_IMPLEMENTATION.md` | 26KB | Monetization |
| `MULTI_TENANCY_IMPLEMENTATION.md` | 3KB | Multi-tenancy |
| `NOTIFICATION_SYSTEM.md` | 6KB | Notification system |
| `SUBSCRIPTION_SYSTEM_IMPLEMENTATION.md` | 26KB | Subscription system |
| `SUPER_ADMIN_IMPLEMENTATION.md` | 16KB | Super admin panel |
| `SHOWCASE_ORGANIZATIONS.md` | 8KB | Showcase organizations |
| `SETUP_GUIDES_IMPLEMENTATION.md` | 27KB | Setup guides/help system |

## Key design decisions preserved

### Architecture
- React 19 + TypeScript, PWA-only (no Capacitor/Android)
- State-based routing (no React Router) via `currentPath` in App.tsx
- Context + Event Bus pattern (no Redux)
- Service layer facade: `hrService` aggregates all domain services
- Multi-tenant via `organization_id` filtering on every query

### Data Flow
```
Pages/Components → Hooks → hrService (facade) → Domain Services → apiClient → Supabase
```

### Role-Based Access
- Roles: SUPER_ADMIN, ADMIN, HR, MANAGER, TEAM_LEAD, EMPLOYEE
- Sidebar filtered by role
- Dashboard dispatches to role-specific components
- Data scoped by role + organization

### Subscription System
- Statuses: TRIAL, ACTIVE, EXPIRED, SUSPENDED, AD_SUPPORTED
- SubscriptionContext provides `canPerformAction()` with 2-min refresh
- Trial expiration handled by cron-expire-trials Edge Function (daily)
- Ad-supported mode shows AdBanner components

### Multi-Tenancy
- Every table has `organization_id` column
- All queries scoped by `apiClient.getOrganizationId()`
- Org ID derived from auth session → profiles lookup
- RLS policies enforce org isolation at database level

### Blog & Tutorials
- Blog posts stored in `blog_posts` table (public read)
- Tutorials stored in `tutorials` table (public read)
- Rich text editor with WebP image upload to content-images bucket
- SEO: clean URLs, JSON-LD, sitemap, RSS feed
- Social crawler prerender via Vercel Edge Middleware

### Landing Page
- Sections: Hero, Features, FAQ, CTA, Footer
- SaaS-style design with dark/light mode
- Ad slots: landing-hero, landing-mid
- Open Graph / Twitter Card meta for social previews
- Organization showcase carousel

### Super Admin
- Platform-wide org/user management
- Bulk email broadcaster via send-bulk-email Edge Function
- Ad configuration management
- Push notification broadcast
- Platform theme default

### Monetization
- Ad-supported tier with AdBanner/PublicAdBanner components
- Donation system with upgrade requests
- AdSense, custom HTML, and image ad types
- Slot-based placement (sidebar, dashboard, landing, blog)

Current architecture details are maintained in `Others/CLAUDE.md`.
