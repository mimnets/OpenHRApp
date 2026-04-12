# OpenHR - Image Management, CDN & Super Admin Plan

**Date**: 2026-04-12
**Status**: Draft - For Review

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [PWA Icons - PNG vs WebP](#2-pwa-icons---png-vs-webp)
3. [Cloudflare CDN Integration](#3-cloudflare-cdn-integration)
4. [Super Admin Image Management Panel](#4-super-admin-image-management-panel)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Risk & Considerations](#6-risk--considerations)

---

## 1. Current State Audit

### Images in `/public/img/`

| File | Size | WebP Version | Used By |
|------|------|--------------|---------|
| `icon-192.png` | 12 KB | No (skipped intentionally) | PWA manifest (192x192 icon) |
| `icon-512.png` | 48 KB | No (skipped intentionally) | PWA manifest (512x512 icon) |
| `logo.png` | 119 KB | `logo.webp` (47 KB) | Apple touch icons, structured data |
| `mobile-logo.png` | 69 KB | `mobile-logo.webp` (8.1 KB) | Mobile header, favicon |
| `screenshot-mobile.png` | 54 KB | `screenshot-mobile.webp` (7.9 KB) | PWA install prompt |
| `screenshot-wide.png` | 133 KB | `screenshot-wide.webp` (37 KB) | PWA install prompt |

### Where Images Are Referenced

| Location | File | What |
|----------|------|------|
| `index.html:69-72` | `logo.png` | Apple touch icons (152, 180, 167px) |
| `index.html:74` | `mobile-logo.webp` | Favicon |
| `index.html:290` | `logo.webp` | Loading splash screen |
| `index.html:20,28,44` | `logo.webp` | Open Graph & structured data |
| `public/manifest.json` | `icon-192.png`, `icon-512.png` | PWA install icons |
| `public/manifest.json` | `screenshot-mobile.png`, `screenshot-wide.png` | PWA install screenshots |
| `src/layouts/MainLayout.tsx:67` | `mobile-logo.webp` | Mobile app header logo |

### Existing WebP Infrastructure

- **`scripts/convert-to-webp.mjs`** - Batch converts PNGs to WebP (85% quality), skips PWA icons
- **`src/utils/imageConvert.ts`** - Runtime WebP conversion for user uploads (avatars, selfies, blog covers, etc.)
- **`src/services/api.client.ts`** - Auto-converts image data URLs to WebP blobs in FormData

### Current Caching (via Workbox in `vite.config.ts`)

- `/img/` files: `CacheFirst`, 30-day expiration, max 100 entries
- Google Fonts: `StaleWhileRevalidate`
- API calls: `NetworkFirst`, 30s timeout

---

## 2. PWA Icons - PNG vs WebP

### Why PWA Icons Are Currently PNG

The `scripts/convert-to-webp.mjs` **intentionally skips** `icon-192.png` and `icon-512.png`. This is correct because:

1. **PWA Manifest Spec**: The W3C Web App Manifest spec requires `image/png` as the baseline format. All platforms (Android, iOS, Windows) guarantee PNG support.
2. **iOS Safari**: Does NOT support WebP icons in the manifest as of iOS 17+. Using WebP would break the PWA icon on iPhones.
3. **Android Chrome**: Supports WebP in manifest but PNG is universally safer.
4. **Size Impact**: icon-192 is only 12 KB, icon-512 is 48 KB - the savings from WebP would be minimal (~5-20 KB total).

### Recommendation: Keep PWA Icons as PNG

**Do NOT convert PWA icons to WebP.** The risk of breaking iOS PWA installations outweighs the tiny size savings. Instead, optimize the PNGs with tools like `pngquant` or `optipng` if needed.

### What CAN Use WebP

The manifest `screenshots` can optionally use WebP (already have WebP versions):
```json
{
  "src": "/img/screenshot-mobile.webp",
  "sizes": "390x844",
  "type": "image/webp"
}
```
However, keep PNG as fallback for older browsers.

---

## 3. Cloudflare CDN Integration

### Option A: Cloudflare Pages (Recommended for Static Assets)

If the frontend is deployed on Cloudflare Pages or behind Cloudflare proxy:

**Benefits:**
- Automatic edge caching of all static assets (images, JS, CSS)
- Global CDN with 300+ edge locations
- Automatic Brotli/gzip compression
- Free SSL

**Setup Steps:**
1. Point your domain DNS to Cloudflare (if not already)
2. Enable Cloudflare proxy (orange cloud) for `openhrapp.com`
3. Configure caching rules:
   - `/img/*` - Cache for 30 days (edge + browser)
   - `/assets/*` - Cache for 1 year (Vite hashed filenames)
   - `manifest.json` - Cache for 1 day
4. Enable "Auto Minify" for JS/CSS/HTML
5. Enable "Polish" (image optimization) if on Pro plan

### Option B: Cloudflare R2 + Workers (For Dynamic Images)

For user-uploaded images (avatars, blog covers, etc.) served from PocketBase:

**Architecture:**
```
User Upload → PocketBase Storage → Cloudflare R2 (origin)
                                        ↓
                                  Cloudflare CDN (edge cache)
                                        ↓
                                    End User
```

**Setup Steps:**
1. Create a Cloudflare R2 bucket for image storage
2. Create a Cloudflare Worker to:
   - Proxy image requests from R2
   - Apply on-the-fly transformations (resize, format conversion)
   - Set proper cache headers
3. Add a PocketBase hook to sync uploaded images to R2
4. Update frontend image URLs to use CDN domain (e.g., `cdn.openhrapp.com`)

### Option C: Cloudflare Image Optimization (Simplest)

If domain is already on Cloudflare:

**Setup Steps:**
1. Enable "Polish" in Cloudflare dashboard (Speed → Optimization → Image Optimization)
2. Choose "Lossy" mode for best compression
3. Enable "WebP" auto-conversion - Cloudflare will serve WebP to supported browsers automatically
4. No code changes needed

**This automatically:**
- Converts PNG/JPEG to WebP at the edge
- Strips metadata
- Optimizes compression
- Serves the right format per browser

### Recommended Approach

| Asset Type | Solution | Effort |
|------------|----------|--------|
| Static images (`/public/img/`) | Option A or C - Cloudflare proxy + Polish | Low |
| User uploads (avatars, blog covers) | Option B - R2 + Worker | Medium-High |
| PWA icons | Keep as PNG, cache via Cloudflare | None |

### Environment Variable Changes

```env
# Add to .env.production
VITE_CDN_URL=https://cdn.openhrapp.com    # For static assets (optional)
VITE_IMAGE_CDN_URL=https://img.openhrapp.com  # For dynamic images (if using R2)
```

### Frontend Code Changes (If Using CDN for Dynamic Images)

Create a helper in `src/utils/cdn.ts`:
```typescript
export function getImageUrl(path: string): string {
  const cdnBase = import.meta.env.VITE_IMAGE_CDN_URL;
  if (cdnBase && import.meta.env.PROD) {
    return `${cdnBase}/${path}`;
  }
  // Fallback to PocketBase direct URL
  return path;
}
```

---

## 4. Super Admin Image Management Panel

### Current Super Admin Capabilities

The super admin panel (`/src/components/superadmin/`) already manages:
- Theme colors (AppearanceManagement)
- Storage cleanup (StorageManagement)
- Blog cover images (BlogManagement)
- Tutorial cover images (TutorialManagement)
- Showcase logos (ShowcaseManagement)

**Missing: No central panel for managing site-wide branding images (logos, banners, PWA icons).**

### Proposed: Site Branding Management Panel

#### New Component: `BrandingManagement.tsx`

**Location**: `src/components/superadmin/BrandingManagement.tsx`

**Features:**

| Feature | Description | Image Specs |
|---------|-------------|-------------|
| **App Logo** | Main logo used in header, footer, loading screen | Recommended: 739x576px, auto-generates all variants |
| **Mobile Logo** | Compact logo for mobile header | Recommended: 200x200px |
| **PWA Icon** | App icon for installed PWA | Auto-generated: 192x192 and 512x512 from source |
| **Favicon** | Browser tab icon | Auto-generated from mobile logo |
| **Landing Page Banner** | Hero section background/banner image | Recommended: 1920x1080px |
| **OG Image** | Social media preview image | Recommended: 1200x630px |
| **PWA Screenshots** | Install prompt previews | Mobile: 390x844, Desktop: 1920x1080 |

#### PocketBase Collection: `site_settings`

```javascript
// New PocketBase collection schema
{
  name: "site_settings",
  type: "base",
  fields: [
    { name: "key", type: "text", required: true, unique: true },
    { name: "value", type: "json" },
    { name: "image", type: "file", maxSelect: 1, maxSize: 5242880 },  // 5MB
    { name: "description", type: "text" }
  ]
}
```

**Rows:**
| Key | Image Field | Description |
|-----|-------------|-------------|
| `logo` | Main logo file | Primary brand logo |
| `mobile_logo` | Mobile logo file | Compact mobile logo |
| `pwa_icon_source` | Source icon file | Used to generate 192/512 PWA icons |
| `landing_banner` | Banner image file | Landing page hero banner |
| `og_image` | OG image file | Social sharing preview |
| `screenshot_mobile` | Mobile screenshot | PWA install preview (mobile) |
| `screenshot_wide` | Desktop screenshot | PWA install preview (desktop) |

#### UI Design

```
+----------------------------------------------------------+
| Site Branding Management                                  |
+----------------------------------------------------------+
|                                                          |
| [Logo Section]                                           |
| +-------------+  +----------------------------------+    |
| | Current Logo|  | Upload New Logo                   |    |
| | (preview)   |  | [Choose File] [Upload]            |    |
| +-------------+  | Recommended: 739x576px PNG/WebP   |    |
|                   | Auto-generates: WebP, mobile,     |    |
|                   | PWA icons (192/512)               |    |
|                   +----------------------------------+    |
|                                                          |
| [Mobile Logo Section]                                    |
| +-------------+  +----------------------------------+    |
| | Current     |  | Upload New Mobile Logo            |    |
| | (preview)   |  | [Choose File] [Upload]            |    |
| +-------------+  | Recommended: 200x200px            |    |
|                   +----------------------------------+    |
|                                                          |
| [Landing Page Banner]                                    |
| +-------------+  +----------------------------------+    |
| | Current     |  | Upload New Banner                 |    |
| | (preview)   |  | [Choose File] [Upload]            |    |
| +-------------+  | Recommended: 1920x1080px          |    |
|                   +----------------------------------+    |
|                                                          |
| [PWA Screenshots]                                        |
| +-------+ +-------+  +-----------------------------+    |
| |Mobile | |Desktop|  | Upload Screenshots           |    |
| |preview| |preview|  | Mobile: 390x844             |    |
| +-------+ +-------+  | Desktop: 1920x1080          |    |
|                       +-----------------------------+    |
|                                                          |
| [Actions]                                                |
| [Clear Cache] [Regenerate All Icons] [Reset to Default]  |
+----------------------------------------------------------+
```

#### Backend Processing Pipeline

When a super admin uploads a new logo:

```
1. Upload logo image
2. Convert to WebP (via convertFileToWebP)
3. Store in PocketBase site_settings collection
4. Server-side hook generates:
   - logo.webp (optimized)
   - mobile-logo.webp (cropped/resized)
   - icon-192.png (PWA icon - stays PNG)
   - icon-512.png (PWA icon - stays PNG)
5. Update manifest.json references (if URLs change)
6. Invalidate service worker cache
7. If using Cloudflare CDN: purge cache via API
```

#### Service: `src/services/branding.service.ts`

```typescript
interface BrandingSetting {
  key: string;
  value: Record<string, any>;
  image: string;
  description: string;
}

class BrandingService {
  // Get all branding settings
  async getAll(): Promise<BrandingSetting[]>

  // Get specific branding image URL
  async getImageUrl(key: string): Promise<string>

  // Upload new branding image
  async updateImage(key: string, file: File): Promise<BrandingSetting>

  // Reset to default
  async resetToDefault(key: string): Promise<void>

  // Regenerate all icon variants from source
  async regenerateIcons(): Promise<void>

  // Clear CDN/SW cache
  async clearCache(): Promise<void>
}
```

#### Integration Points

1. **MainLayout.tsx** - Fetch logo dynamically from branding service instead of static path
2. **index.html** - Use a build-time or SSR approach to inject correct logo URLs
3. **Landing page components** - Fetch banner/hero images from branding service
4. **manifest.json** - Either serve dynamically or update via PocketBase hook

---

## 5. Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)

- [ ] Optimize existing PNG icons with `pngquant` (reduce icon-512 from 48KB to ~20KB)
- [ ] Update `manifest.json` screenshots to reference WebP versions
- [ ] Add proper `Cache-Control` headers if not already set by hosting

### Phase 2: Cloudflare CDN Setup (2-3 days)

- [ ] Configure Cloudflare proxy for domain (if not already)
- [ ] Enable Polish (image optimization) and WebP auto-conversion
- [ ] Set up Page Rules for caching:
  - `/img/*` → Cache 30 days
  - `/assets/*` → Cache 1 year
- [ ] Test PWA installation on iOS and Android after CDN setup
- [ ] Monitor Cloudflare analytics for cache hit ratios

### Phase 3: PocketBase Collection Setup (1-2 days)

- [ ] Create `site_settings` collection in PocketBase
- [ ] Create migration/seed script for default branding values
- [ ] Create PocketBase hook for image processing (resize, generate variants)
- [ ] Create `branding.service.ts` in frontend

### Phase 4: Super Admin Branding Panel (3-5 days)

- [ ] Create `BrandingManagement.tsx` component
- [ ] Implement image upload with preview
- [ ] Implement auto-generation of icon variants (192/512 PNG from source)
- [ ] Add WebP conversion on upload
- [ ] Add image dimension validation
- [ ] Add "Reset to Default" functionality

### Phase 5: Dynamic Image Loading (2-3 days)

- [ ] Update `MainLayout.tsx` to load logo from branding service
- [ ] Create a branding context/store for caching brand images in memory
- [ ] Update landing page components to use dynamic banner
- [ ] Handle fallback to default images if branding service fails
- [ ] Update service worker to handle dynamic branding image cache

### Phase 6: Cloudflare R2 for Dynamic Images (Optional, 3-5 days)

- [ ] Set up R2 bucket
- [ ] Create Cloudflare Worker for image proxy
- [ ] Add PocketBase hook to sync to R2
- [ ] Update frontend to use CDN URLs for user uploads
- [ ] Set up cache purge on image update

### Estimated Total: 12-20 days

---

## 6. Risk & Considerations

### PWA Icon Risks
- **DO NOT** change PWA icon format to WebP - will break iOS installations
- **DO NOT** change icon URLs without updating manifest AND clearing old service worker caches
- After changing icons, users may need to uninstall/reinstall PWA to see new icons

### CDN Risks
- Ensure Cloudflare does NOT cache API responses (only static assets)
- Test PWA offline behavior after CDN setup
- Ensure `manifest.json` is not aggressively cached (max 1 day)
- If using Polish, ensure it doesn't modify PWA icon dimensions

### Super Admin Risks
- Image processing (resize/convert) should happen server-side to avoid browser memory issues with large files
- Set maximum file size limits (5MB recommended)
- Always keep default fallback images
- Cache invalidation is the hardest part - plan for it

### Performance Considerations
- Dynamic branding images add an API call on page load - cache aggressively
- Consider base64-inlining small icons (< 5KB) to avoid extra requests
- Use `<link rel="preload">` for critical branding images

---

## File References

| File | Purpose |
|------|---------|
| `/public/manifest.json` | PWA manifest with icon references |
| `/public/img/` | All static branding images |
| `/index.html` | Apple touch icons, OG images, favicon |
| `/src/layouts/MainLayout.tsx` | Mobile header logo |
| `/src/utils/imageConvert.ts` | WebP conversion utilities |
| `/src/services/api.client.ts` | Auto WebP conversion in FormData |
| `/scripts/convert-to-webp.mjs` | Batch PNG→WebP conversion |
| `/scripts/generate-icons.cjs` | Android icon generation from logo |
| `/vite.config.ts` | Service worker & caching config |
| `/src/components/superadmin/` | Existing super admin panels |
