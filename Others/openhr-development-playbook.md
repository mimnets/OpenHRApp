File deleted

Claude plan:
Auto WebP Conversion + Cloudflare R2 Storage                                                                           │
│                                                                                                                        │
│ Context                                                                                                                │
│                                                                                                                        │
│ All image uploads (avatars, selfies, logos, cover images, screenshots) are currently stored as JPEG/PNG on PocketBase  │
│ local disk. This increases page load times and storage costs. The goal is to:                                          │
│ 1. Auto-convert all uploads to .webp (smaller files, faster loads)                                                     │
│ 2. Serve files from Cloudflare R2 via PocketBase's native S3 support                                                   │
│                                                                                                                        │
│ Key insight: PocketBase has built-in S3-compatible storage. Once configured in admin UI, pb.files.getURL()             │
│ automatically returns R2 URLs — no URL code changes needed across the 17+ call sites.                                  │
│                                                                                                                        │
│ ---                                                                                                                    │
│ Step 1: Create WebP conversion utility                                                                                 │
│                                                                                                                        │
│ New file: src/utils/imageConvert.ts                                                                                    │
│                                                                                                                        │
│ - convertToWebP(input: string | Blob, quality = 0.8): Promise<Blob> — uses Canvas API to re-encode any image as webp   │
│ - convertFileToWebP(file: File, quality = 0.8): Promise<File> — wraps Blob result into a File with .webp extension     │
│ (needed for direct FormData uploads)                                                                                   │
│ - Feature-detection fallback: if browser doesn't support webp canvas output, returns original unchanged                │
│                                                                                                                        │
│ Step 2: Modify apiClient.toFormData() — central data URL handler                                                       │
│                                                                                                                        │
│ File: src/services/api.client.ts                                                                                       │
│                                                                                                                        │
│ - Make toFormData async                                                                                                │
│ - Change default filename from 'file.jpg' to 'file.webp'                                                               │
│ - Auto-convert data:image/* values to webp before creating Blob                                                        │
│ - This single change covers: employee avatars, attendance selfies (all data URL flows)                                 │
│                                                                                                                        │
│ Step 3: Update toFormData callers to await                                                                             │
│                                                                                                                        │
│ All 3 callers are already in async functions — just add await and change filenames:                                    │
│                                                                                                                        │
│ ┌────────────────────────────────────┬──────┬────────────────────────────────────────────────────┐                     │
│ │                File                │ Line │                       Change                       │                     │
│ ├────────────────────────────────────┼──────┼────────────────────────────────────────────────────┤                     │
│ │ src/services/employee.service.ts   │ 104  │ await apiClient.toFormData(pbData, 'avatar.webp')  │                     │
│ ├────────────────────────────────────┼──────┼────────────────────────────────────────────────────┤                     │
│ │ src/services/employee.service.ts   │ 120  │ await apiClient.toFormData(pbData, 'avatar.webp')  │                     │
│ ├────────────────────────────────────┼──────┼────────────────────────────────────────────────────┤                     │
│ │ src/services/attendance.service.ts │ 146  │ await apiClient.toFormData(payload, 'selfie.webp') │                     │
│ └────────────────────────────────────┴──────┴────────────────────────────────────────────────────┘                     │
│                                                                                                                        │
│ Step 4: Camera output — jpeg to webp                                                                                   │
│                                                                                                                        │
│ File: src/hooks/attendance/useCamera.ts                                                                                │
│                                                                                                                        │
│ - Line 87: Change canvas.toDataURL('image/jpeg', 0.8) to canvas.toDataURL('image/webp', 0.8)                           │
│ - Capacitor takePhoto/selectFromGallery return JPEG data URLs — these get converted automatically by Step 2            │
│                                                                                                                        │
│ Step 5: Direct File uploads — convert before FormData append                                                           │
│                                                                                                                        │
│ These upload raw File objects (not data URLs), so they bypass toFormData. Use convertFileToWebP() before appending:    │
│                                                                                                                        │
│ ┌───────────────────────────────────────────┬─────────────────────┬────────────────────────────────┐                   │
│ │                   File                    │        What         │           Method(s)            │                   │
│ ├───────────────────────────────────────────┼─────────────────────┼────────────────────────────────┤                   │
│ │ src/components/organization/OrgSystem.tsx │ org logo            │ handleOrgDataSave              │                   │
│ ├───────────────────────────────────────────┼─────────────────────┼────────────────────────────────┤                   │
│ │ src/services/blog.service.ts              │ cover image         │ createPost, updatePost         │                   │
│ ├───────────────────────────────────────────┼─────────────────────┼────────────────────────────────┤                   │
│ │ src/services/tutorial.service.ts          │ cover image         │ createTutorial, updateTutorial │                   │
│ ├───────────────────────────────────────────┼─────────────────────┼────────────────────────────────┤                   │
│ │ src/services/showcase.service.ts          │ logo                │ create, update                 │                   │
│ ├───────────────────────────────────────────┼─────────────────────┼────────────────────────────────┤                   │
│ │ src/services/upgrade.service.ts           │ donation screenshot │ submitDonationRequest          │                   │
│ └───────────────────────────────────────────┴─────────────────────┴────────────────────────────────┘                   │
│                                                                                                                        │
│ All are already async — just add const webpFile = await convertFileToWebP(file) before the formData.append().          │
│                                                                                                                        │
│ Step 6: Server-side validation hook (lenient)                                                                          │
│                                                                                                                        │
│ File: Others/pb_hooks/main.pb.js                                                                                       │
│                                                                                                                        │
│ Add onRecordCreateRequest / onRecordUpdateRequest hooks for image collections that log a warning if a non-webp file is │
│  uploaded. Lenient mode (log only, don't reject) during rollout — can switch to strict later.                          │
│                                                                                                                        │
│ Collections: users (avatar), attendance (selfie_in/selfie_out), organizations (logo), blog_posts (cover_image),        │
│ tutorials (cover_image), showcase_organizations (logo), upgrade_requests (donation_screenshot)                         │
│                                                                                                                        │
│ Step 7: Configure R2 in PocketBase Admin (manual, no code)                                                             │
│                                                                                                                        │
│ Document for deployment:                                                                                               │
│ 1. PocketBase Admin > Settings > Files storage > S3                                                                    │
│ 2. Endpoint: https://<account-id>.r2.cloudflarestorage.com                                                             │
│ 3. Bucket: your R2 bucket name                                                                                         │
│ 4. Region: auto                                                                                                        │
│ 5. Access Key / Secret: R2 API credentials                                                                             │
│ 6. Force path style: Enabled (required for R2)                                                                         │
│ 7. Optional: set Public URL to a custom domain (e.g., files.openhrapp.com) for CDN performance                         │
│                                                                                                                        │
│ Once enabled, pb.files.getURL() returns R2 URLs automatically. Old local files continue working.                       │
│                                                                                                                        │
│ ---                                                                                                                    │
│ Files Modified (12 files)                                                                                              │
│                                                                                                                        │
│ ┌─────┬───────────────────────────────────────────┬──────────────────────────────────────┐                             │
│ │  #  │                   File                    │             Change Type              │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 1   │ src/utils/imageConvert.ts                 │ NEW — webp conversion utility        │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 2   │ src/services/api.client.ts                │ Make toFormData async + webp convert │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 3   │ src/services/employee.service.ts          │ Add await, change to .webp           │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 4   │ src/services/attendance.service.ts        │ Add await, change to .webp           │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 5   │ src/hooks/attendance/useCamera.ts         │ jpeg → webp in canvas output         │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 6   │ src/components/organization/OrgSystem.tsx │ Convert logo File to webp            │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 7   │ src/services/blog.service.ts              │ Convert cover image to webp          │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 8   │ src/services/tutorial.service.ts          │ Convert cover image to webp          │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 9   │ src/services/showcase.service.ts          │ Convert logo to webp                 │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 10  │ src/services/upgrade.service.ts           │ Convert screenshot to webp           │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 11  │ Others/pb_hooks/main.pb.js                │ Server-side format validation hook   │                             │
│ ├─────┼───────────────────────────────────────────┼──────────────────────────────────────┤                             │
│ │ 12  │ PocketBase Admin UI                       │ R2 configuration (manual)            │                             │
│ └─────┴───────────────────────────────────────────┴──────────────────────────────────────┘                             │
│                                                                                                                        │
│ NOT modified: All 17+ pb.files.getURL() call sites — PocketBase handles R2 URLs automatically.                         │
│                                                                                                                        │
│ Verification                                                                                                           │
│                                                                                                                        │
│ 1. Upload avatar → verify stored file is .webp (check PocketBase admin > record)                                       │
│ 2. Take attendance selfie → verify .webp                                                                               │
│ 3. Upload org logo → verify .webp                                                                                      │
│ 4. Upload blog/tutorial cover → verify .webp                                                                           │
│ 5. Check Capacitor photo flow on Android → verify conversion works                                                     │
│ 6. After R2 config → verify pb.files.getURL() returns R2 domain URL                                                    │
│ 7. Verify old JPEG/PNG files still load correctly 


# Site Imporvement:

Here's a comprehensive analysis of your OpenHR app with actionable recommendations to attract more organic visitors:       
  ---                                                                                                                     
  Current State  
                                                                                                                            Your app is a well-built open-source HRMS with solid fundamentals — good meta tags, PWA support, Google Analytics, and a
   rich landing page. But there are significant gaps holding back organic growth.

  ---
  Critical Issues to Fix First

  1. Hash-based routing kills blog SEO

  Your blog uses #/blog/{slug} routes. Search engines largely ignore content after #. This means your blog posts — your   
  primary organic content — are invisible to Google.

  Fix: Migrate blog and tutorial routes to clean URLs (/blog/{slug}, /how-to-use/{slug}) using pushState, like you already
   do for /privacy and /terms. Update vercel.json rewrites to support these paths.

  2. Sitemap is too thin

  Only 2 entries (/ and /#/blog). Every blog post, tutorial, and public page should have its own entry.

  Fix: Generate a dynamic sitemap that includes all blog posts and tutorials with their clean URLs. You can build this as 
  a build-time script or a PocketBase endpoint.

  3. No structured data (JSON-LD)

  You're missing schema.org markup entirely. This means no rich snippets in search results.

  Fix: Add JSON-LD for:
  - SoftwareApplication on the landing page
  - Organization for OpenHRApp
  - Article on each blog post
  - FAQPage on your FAQ section (this can get you FAQ rich results in Google)
  - BreadcrumbList for navigation hierarchy

  4. No SSR/prerendering for public pages

  As a pure SPA, Google's crawler must execute JavaScript to see your content. While Googlebot can handle JS, it's slower 
  and less reliable.

  Fix: Use Vite SSG (e.g., vite-ssg) or a prerendering plugin (e.g., vite-plugin-prerender) to generate static HTML for   
  public pages: landing, blog posts, tutorials, privacy, terms, download.

  ---
  Content Strategy for Organic Traffic

  5. Blog content topics (high-intent keywords)

  Target searches your audience is already making:

  ┌──────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────┐   
  │    Topic Cluster     │                                       Example Posts                                        │   
  ├──────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ HR compliance        │ "Leave policy template for Bangladesh companies", "Labor law attendance requirements 2026" │   
  ├──────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ HRMS comparisons     │ "Best free HRMS software for small companies", "OpenHR vs [competitor] comparison"         │   
  ├──────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ How-to guides        │ "How to set up attendance tracking with GPS", "How to automate leave approval workflows"   │   
  ├──────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ HR templates         │ "Employee handbook template", "Performance review form template"                           │   
  ├──────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ Industry pain points │ "How to prevent buddy punching", "Remote employee attendance tracking"                     │   
  └──────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────┘   

  6. Create dedicated feature landing pages

  Instead of one big landing page, create individual pages for each feature:
  - /features/attendance-tracking
  - /features/leave-management
  - /features/performance-reviews
  - /features/gps-geofencing
  - /features/biometric-selfie-verification

  Each page targets different search queries and can rank independently.

  7. Add a changelog / updates page

  /changelog — shows active development, builds trust, and creates fresh crawlable content.

  ---
  Technical SEO Improvements

  8. Performance quick wins

  - Add code splitting — you load all routes upfront. Use React.lazy() for authenticated pages
  - Self-host Tailwind CSS instead of CDN — eliminates render-blocking external request and enables tree-shaking
  - Add fetchpriority="high" to your hero image/LCP element

  9. Improve meta tags per page

  Currently all pages share the same meta tags from index.html. Each public page should have unique:
  - <title> — e.g., "GPS Attendance Tracking | OpenHR - Free HRMS"
  - <meta name="description"> — unique per page
  - <link rel="canonical"> — unique per page

  Use document.title and dynamic meta tag updates for each public route.

  10. Add internal linking

  - Blog posts should link to feature pages and vice versa
  - Tutorials should link to relevant blog posts
  - Landing page sections should link to dedicated feature pages

  ---
  Off-Site & Distribution

  11. GitHub SEO

  - Optimize your GitHub repo README with keywords ("open source HRMS", "free HR software")
  - Add topics/tags to the repo
  - GitHub repos rank well in Google for "open source [category]" searches

  12. Listing directories

  Submit OpenHR to:
  - Product Hunt — launch for visibility
  - AlternativeTo — list as alternative to BambooHR, Zoho People, etc.
  - G2 / Capterra — free listing for open-source tools
  - Awesome lists — e.g., awesome-selfhosted, awesome-hr

  13. Open Graph images

  You reference screenshot-wide.png — make sure this image is compelling and up-to-date. Consider creating unique OG      
  images per blog post for better social sharing click-through.

  ---
  Priority Roadmap

  ┌──────────┬────────────────────────────────────────┬──────────────────────────────┐
  │ Priority │                 Action                 │            Impact            │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P0       │ Fix blog routing (hash → clean URLs)   │ Unblocks all blog SEO        │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P0       │ Add prerendering for public pages      │ Makes content crawlable      │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P1       │ Expand sitemap with all public URLs    │ Improves indexing            │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P1       │ Add JSON-LD structured data            │ Rich snippets in SERPs       │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P1       │ Create 5-10 targeted blog posts        │ Organic keyword traffic      │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P2       │ Build feature landing pages            │ Long-tail keyword coverage   │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P2       │ Per-page meta tags                     │ Better click-through rates   │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P2       │ Code splitting + Tailwind self-hosting │ Core Web Vitals boost        │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P3       │ Submit to directories                  │ Backlinks + referral traffic │
  ├──────────┼────────────────────────────────────────┼──────────────────────────────┤
  │ P3       │ GitHub README optimization             │ Developer audience capture   │
  └──────────┴────────────────────────────────────────┴──────────────────────────────┘

  ---
  Want me to start implementing any of these? The highest-impact change would be fixing the blog routing from hash-based  
  to clean URLs — that single change would unlock your blog content for Google indexing.