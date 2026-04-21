# OpenHRApp — SEO Audit & Improvement Guide

**Audit date:** 2026-04-21
**Scope:** Public marketing surface of `https://openhrapp.com` (landing, features, blog, tutorials, changelog, policies).
**Stack context:** React 19 + Vite SPA deployed on Vercel. Client-side routing with `updatePageMeta()` / `setJsonLd()` helpers in `src/utils/seo.ts`. Blog + tutorial content served from PocketBase at `pocketbase.mimnets.com`. Sitemap is generated at build time by `scripts/generate-sitemap.mjs`.

---

## Executive Summary

Overall health: **Moderate.** The foundations are in place — valid sitemap generation, dynamic `<title>` / meta description / canonical per route, rich JSON-LD on most pages, clean URL structure, proper heading hierarchy on the landing page, and a correctly configured `robots.txt` that blocks the authenticated app surface. The site is already indexable and structured sensibly.

The single biggest SEO risk is that the app is **100% client-rendered with no prerendering**, so every bot receives an empty `<div id="root">` plus a splash screen in static HTML. Googlebot can render JS and will generally cope, but social crawlers (Slack, LinkedIn, Facebook, Twitter/X), Bingbot, and the growing class of LLM / AI-search crawlers mostly cannot — and when combined with the fact that **Open Graph and Twitter Card meta tags are never updated after load**, every social share of every page currently previews the homepage.

### Top priorities (in order)

1. Prerender the public marketing routes to static HTML at build time.
2. Make `updatePageMeta()` also rewrite `og:*` and `twitter:*` tags — this is a ~15-line change that fixes every social share preview sitewide.
3. Fix the sitemap's missing `lastmod` timestamps on static routes.
4. Add JSON-LD to `TutorialsPage`, `PrivacyPolicyPage`, `TermsOfServicePage`.
5. Serve real 404s (or at least `x-robots-tag: noindex`) for unknown routes.

---

## Findings

### 1. Crawlability & Indexation

#### 1.1 No SSR or prerendering — **HIGH**
- **Evidence:** `vite.config.ts`, `package.json`, `vercel.json` — no `vite-plugin-ssr`, `vite-plugin-prerender`, `react-snap`, or equivalent. `vercel.json:3` rewrites every non-asset route to `/index.html`. First HTML byte contains only the splash-loader div (`index.html:134-150`), no route content.
- **Impact:** Social unfurls, Bing, Yandex, many LLM crawlers, and archive bots see no content. Googlebot will render but pays a crawl-budget tax and may delay indexing new blog posts by days.
- **Fix:** See §A1 in the action plan.

#### 1.2 Unknown routes return HTTP 200 — **MEDIUM**
- **Evidence:** `vercel.json:3` — catch-all rewrite to `/index.html`. `src/pages/NotFoundPage.tsx:12-15` updates `document.title` but cannot set an HTTP status from the client. No `X-Robots-Tag` header is emitted.
- **Impact:** Search engines may index typo / garbage URLs as soft-404s, diluting the site's quality signals.
- **Fix:** See §B2.

#### 1.3 `robots.txt` is correct — **PASS**
- `public/robots.txt:1-22` explicitly disallows `/dashboard`, `/employees`, `/attendance`, `/leave`, `/settings`, `/reports`, `/organization`, `/super-admin`, `/upgrade`, `/_/`. Public marketing paths are allowed. Sitemap is referenced. No action needed.

#### 1.4 Sitemap is generated dynamically but missing `lastmod` on static routes — **MEDIUM**
- **Evidence:** `scripts/generate-sitemap.mjs:16-32, 53-60` — the static `STATIC_PAGES` entries are written without a `<lastmod>`. Blog and tutorial entries (dynamic) do get `lastmod`. The current `public/sitemap.xml` confirms this (lines 3-77 have no `<lastmod>`).
- **Impact:** Bots cannot use `lastmod` as a freshness signal for `/`, `/features`, `/features/*`, `/changelog`, `/privacy`, `/terms`, `/download`, `/blog` (index), `/how-to-use` (index). Minor, but a free win.
- **Fix:** See §B3.

#### 1.5 `/download` is in the sitemap but the route is unclear — **LOW**
- **Evidence:** `scripts/generate-sitemap.mjs:29` and `public/robots.txt:7` both list `/download`. No `DownloadPage.tsx` exists in `src/pages/`. The `src/App.tsx` route table (lines 95-150) does not parse `/download` — it will hit the 404 branch.
- **Impact:** Sitemap advertises a URL that renders as 404 in the SPA (and as a 200 soft-404 at the server). Reduces sitemap trust.
- **Fix:** Either build the `/download` page (it is a natural fit for GitHub releases + APK links) or remove it from the sitemap and robots.txt.

---

### 2. Technical Foundations

#### 2.1 HTTPS, HSTS, mixed content — **PASS (assumed via Vercel defaults)**
Vercel terminates TLS and issues 301s from HTTP. HSTS is enabled by default on Vercel deployments. No mixed-content risks observed in the static HTML.

#### 2.2 Core Web Vitals — **UNKNOWN, likely at risk**
- **Evidence:** `index.html:115-128` loads React, ReactDOM, lucide-react, recharts, and PocketBase via an ESM importmap from `https://esm.sh`. A third-party CDN adds DNS + TCP + TLS on the critical path despite the `preconnect`. `index.html:56-65` defers Ezoic + Ahrefs + Gatekeeper Consent scripts — Ezoic in particular is consistently LCP-hostile.
- **Ads / analytics on critical path:** Ezoic (`ezojs.com`), Ahrefs analytics, Gatekeeper Consent CMP, Google AdSense. Each is defer-loaded, but the CMP and AdSense will block layout once they execute.
- **Impact:** LCP and CLS on mobile are the usual casualties. I couldn't run PageSpeed from here — run it yourself and compare.
- **Fix:** See §C.

#### 2.3 Mobile / viewport — **PASS**
`index.html:5` sets a sensible viewport. `maximum-scale=1.0, user-scalable=no` is a mild accessibility anti-pattern (blocks pinch-zoom), but not an SEO issue.

#### 2.4 URL structure — **PASS**
Clean, lowercase, hyphenated, no parameters, consistent trailing-slash handling. `/features/attendance-tracking`, `/how-to-use/how-to-clock-in-and-out`, etc.

---

### 3. On-Page SEO

#### 3.1 Per-page meta tags — **MOSTLY GOOD**
`updatePageMeta()` is called with unique title/description/canonical on every public route:

| Page | `updatePageMeta` | `setJsonLd` |
|---|---|---|
| `LandingPage.tsx:27-89` | ✓ | ✓ `SoftwareApplication` + `FAQPage` |
| `FeaturesPage.tsx:58-76` | ✓ | ✓ `WebPage` |
| `FeatureDetailPage.tsx:26-56` | ✓ | ✓ `WebPage` + `BreadcrumbList` |
| `BlogPage.tsx:41-68` | ✓ | ✓ `CollectionPage` + `BreadcrumbList` |
| `BlogPostPage.tsx:65-106` | ✓ | ✓ `Article` + `BreadcrumbList` |
| `TutorialPage.tsx:43-97` | ✓ | ✓ `Article` + `BreadcrumbList` |
| `ChangelogPage.tsx:28-41` | ✓ | ✓ `WebPage` |
| `TutorialsPage.tsx:34-38` | ✓ | **MISSING** |
| `PrivacyPolicyPage.tsx:15-19` | ✓ | **MISSING** |
| `TermsOfServicePage.tsx:15-19` | ✓ | **MISSING** |
| `NotFoundPage.tsx:12-15` | ✓ | (intentional — 404) |

#### 3.2 Open Graph / Twitter tags never update after load — **HIGH**
- **Evidence:** `src/utils/seo.ts:12-31` — `updatePageMeta()` touches only `document.title`, `meta[name="description"]`, and `link[rel="canonical"]`. The OG / Twitter tags in `index.html:16-28` are never rewritten on route change.
- **Impact:** Every LinkedIn, Slack, WhatsApp, Twitter/X, Discord, Facebook, iMessage preview of `/blog/*`, `/features/*`, `/how-to-use/*`, `/changelog` shows the **homepage** thumbnail and description. This is the single highest-impact, lowest-effort fix in the audit.
- **Fix:** See §A2.

#### 3.3 Heading structure — **PASS**
- `HeroSection.tsx:216` has the single H1 ("Modern HR Management Made Simple").
- H2s appear in logical order: `HeroSection.tsx:260`, `FeaturesSection.tsx:55`, and the rest of the landing sections.
- No H1 duplicates, no level skips identified on the landing page.

#### 3.4 Image alt text — **PASS (with one gap to audit)**
- Logos in `Navbar.tsx:49`, `Footer.tsx:67`, `ShowcaseSection.tsx:133` all have `alt`.
- Blog list (`BlogPage.tsx:202-207`) and post hero (`BlogPostPage.tsx:149-153`) use `alt={post.title}` — acceptable but generic. Prefer descriptive captions set per-post in PocketBase.
- Splash logo in `index.html:137` has `alt="Loading"` — harmless.
- **Action:** audit blog post body images (authored in the rich-text editor at `src/components/blog/RichTextEditor.tsx`) — the editor should enforce an alt field on image insert. Verify before expanding the blog further.

#### 3.5 Internal linking — **PASS**
- `Navbar.tsx:58-77, 142-167` and `Footer.tsx:30-56` use real anchors with `href` (not just `onClick`), routed through `navigateTo()`. This is correct — bots see real links, humans get SPA transitions.
- Every marketing surface is reachable within 2 clicks of the homepage.

#### 3.6 `index.html` static meta and JSON-LD — **PASS**
- `<html lang="en">` — ✓
- Static `Organization` JSON-LD at `index.html:38-50` — ✓
- The Twitter card is `summary_large_image` — ✓

---

### 4. Content & Authority

#### 4.1 Blog content is DB-driven — **MEDIUM (for non-Google crawlers)**
- **Evidence:** Blog posts are fetched from PocketBase (`src/services/blog/blogService.ts`). Post bodies never appear in the initial HTML payload.
- **Impact:** Googlebot will index them via JS rendering. Bing, LLM crawlers, and social unfurls will not. This compounds with §1.1 and §3.2 — the same underlying problem.
- **Fix:** Subsumed by the prerendering work in §A1; alternatively, emit an RSS feed (`/feed.xml`) so feed-based discovery (AI crawlers, readers) picks up posts.

#### 4.2 E-E-A-T signals on blog posts — **GAP**
- No visible author byline, author page, or published-date display were identified in `BlogPostPage.tsx`. (Verify — I didn't read the full component.) The `Article` JSON-LD should include `author`, `datePublished`, `dateModified`, `image`, and `publisher`.
- **Action:** if the fields exist in PocketBase, surface them in the UI and include them in the `Article` JSON-LD payload.

#### 4.3 Thin pages — **LOW**
- `/privacy`, `/terms`, `/changelog` are appropriately thin and already deprioritized in the sitemap (0.3, 0.3, 0.7). No action needed beyond adding `noindex` to `/privacy` and `/terms` **only if** they are boilerplate — leave indexable if they are project-specific.

#### 4.4 Feature pages — **REVIEW**
- Seven `/features/*` detail URLs are in the sitemap. Verify in the PocketBase-backed feature content (or `src/data/features*`) that each has ≥ 600 words of substantive content, not just a hero + 3 bullets. Thin feature pages hurt more than they help.

---

### 5. Accessibility (adjacent to SEO)

- `lang="en"` present — ✓
- No skip-to-content link — **LOW**
- No `role="main"` / `<main>` landmark on the landing shell — **LOW**
- `user-scalable=no` blocks pinch-zoom — **LOW** accessibility issue, neutral for SEO

---

## Prioritized Action Plan

### A. Critical (do first)

#### A1. Prerender the public marketing routes
The lowest-friction option for a Vite + Vercel SPA is **`vite-plugin-prerender-spa`** or **`vike` (formerly vite-plugin-ssr)** in "pre-rendering only" mode. Recommended approach:

1. Add a build step that enumerates the same URL list used by `scripts/generate-sitemap.mjs`.
2. Prerender each URL to a static `.html` file under `dist/` so Vercel serves it directly.
3. React hydration takes over on first interaction.

Concrete steps:
- Install `vite-plugin-prerender` or `@vite-pwa/assets-generator`-style prerender.
- Reuse the PocketBase fetches from `scripts/generate-sitemap.mjs` to produce the slug list for `/blog/*` and `/how-to-use/*`.
- Keep authenticated routes (`/dashboard`, `/employees`, …) **out** of the prerender list.
- Verify each prerendered HTML contains: `<title>`, `<meta name="description">`, canonical, OG tags, and the JSON-LD `<script>`.

Acceptance criteria: `curl -sSL https://openhrapp.com/blog/<slug>` returns HTML containing the post title and OG image in the `<head>`.

#### A2. Make `updatePageMeta()` rewrite OG and Twitter tags
File: `src/utils/seo.ts`.

Change the signature to accept an optional `image` param and update:
- `meta[property="og:title"]`, `og:description`, `og:url`, `og:image`
- `meta[name="twitter:title"]`, `twitter:description`, `twitter:image`

Every page that already calls `updatePageMeta` will benefit immediately. Pass page-specific images from:
- `BlogPostPage` — the post's cover image URL.
- `FeatureDetailPage` — a per-feature hero image.
- Everything else — fall back to `https://openhrapp.com/img/screenshot-wide.webp`.

This is a ~15-line change. Do it regardless of A1, because even after prerendering you'll want these kept in sync for client-side route transitions.

---

### B. High (do next)

#### B1. Add `setJsonLd()` to the three pages missing it
- `src/pages/TutorialsPage.tsx:34-38` — use `CollectionPage` + `BreadcrumbList`, mirroring `BlogPage.tsx:41-68`.
- `src/pages/PrivacyPolicyPage.tsx:15-19` — use `WebPage` with `lastReviewed`.
- `src/pages/TermsOfServicePage.tsx:15-19` — same.

#### B2. Proper 404 handling
Two options, pick one:
1. **Preferred:** add a Vercel edge middleware (`middleware.ts` at repo root) that inspects the path, checks against the known-route list, and for unknown paths returns `new Response(notFoundHtml, { status: 404, headers: { 'x-robots-tag': 'noindex' } })`.
2. **Minimum:** in `src/pages/NotFoundPage.tsx`, inject a `<meta name="robots" content="noindex">` tag on mount (remove on unmount). This tells bots not to index soft-404s even though the server returned 200.

#### B3. Fix sitemap `lastmod` for static routes
`scripts/generate-sitemap.mjs:16-32, 53-60` — pass `TODAY` (already computed on line 13) as the `lastmod` when building static entries. Even a build-time timestamp is better than nothing and costs zero ops overhead.

#### B4. Resolve `/download`
Either build the page (GitHub releases + APK links — pairs well with the existing `/features/*` narrative) or remove `/download` from `scripts/generate-sitemap.mjs:29` and `public/robots.txt:7`.

---

### C. Performance

#### C1. Audit Core Web Vitals with PageSpeed Insights
Run against:
- `https://openhrapp.com/`
- `https://openhrapp.com/features`
- `https://openhrapp.com/blog` (or a specific post)

For each, capture LCP, INP, CLS on mobile. If any fails, the usual culprits here will be:
- **Ezoic** — defer further, or consider removing entirely on the landing page and keeping it only on `/blog/*` where ad revenue actually lives.
- **ESM from `esm.sh`** — consider bundling React + ReactDOM + lucide-react locally. The importmap is nice for development but a liability for production CWV. Recharts (`src/pages/Reports.tsx` only) and PocketBase should be code-split so the landing page never loads them.
- **Fonts** — Inter is preloaded well. Consider self-hosting via `@fontsource/inter` to drop `fonts.googleapis.com` + `fonts.gstatic.com` from the critical path.

#### C2. Split vendor bundles by route
Verify in `vite.config.ts` that auth-only libraries (pocketbase SDK, recharts, rich-text editor deps) are not in the landing chunk. Chunk size visualizer: `rollup-plugin-visualizer` or `vite-bundle-visualizer`.

---

### D. Content & authority

#### D1. Enforce alt text on blog post images
`src/components/blog/RichTextEditor.tsx` — require `alt` on image insert. Backfill existing posts.

#### D2. Surface author + dates on blog posts
Verify `BlogPostPage.tsx` renders author byline, publish date, and last-updated date, and that `Article` JSON-LD includes `author`, `datePublished`, `dateModified`, `publisher`.

#### D3. Consider an RSS feed
Emit `/feed.xml` at build time (same pattern as the sitemap generator — fetch posts, render an Atom or RSS 2.0 file, write to `public/`). Reference it from the `<head>` via `<link rel="alternate" type="application/rss+xml">`. This helps with both discovery and AI crawler coverage.

#### D4. Quality-check the seven feature detail pages
Read each and confirm ≥ 600 words of genuinely useful content. Thin feature pages are the most common reason SaaS sites underperform in organic search — fewer, richer pages beat many thin ones.

---

### E. Accessibility quick wins (do any time)

- Add a `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` at the top of `MainLayout.tsx` and `LandingPage.tsx`.
- Wrap landing page main content in `<main id="main-content">`.
- Drop `maximum-scale=1.0, user-scalable=no` from `index.html:5` unless you have a specific PWA reason — most users who need zoom will be blocked.

---

## Verification Checklist

After the fixes, verify:

- [ ] `curl -sSL https://openhrapp.com/blog/<slug> | grep -i 'og:title'` returns the post-specific title.
- [ ] `curl -sSL https://openhrapp.com/features/leave-management | grep -i 'application/ld+json'` returns the JSON-LD.
- [ ] Google [Rich Results Test](https://search.google.com/test/rich-results) passes on: home, a blog post, a feature detail, a tutorial.
- [ ] Google [PageSpeed Insights](https://pagespeed.web.dev/) mobile LCP < 2.5s, CLS < 0.1, INP < 200ms on home + a blog post.
- [ ] Sharing a blog URL to Slack / LinkedIn / Twitter shows the post's own thumbnail.
- [ ] `site:openhrapp.com` in Google includes `/blog/*` and `/how-to-use/*` URLs within 14 days.
- [ ] `https://openhrapp.com/this-does-not-exist` returns HTTP 404 (or at least a `noindex` meta tag).
- [ ] `public/sitemap.xml` contains `<lastmod>` on every entry.
