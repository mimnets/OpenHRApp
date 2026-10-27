# Ad frame (ads.openhrapp.com)

A one-page site that rotates Adsterra, A-Ads and Zoho banners. The dashboard shows it in a
sandboxed iframe (`SandboxedAdFrame` in `src/components/ads/AdBanner.tsx`), so ad scripts run on
this origin, never on the app's, and cannot read employee data or the login session.

It is **not** part of the Vite build. Never move it into `public/`: served from the app's own
origin it would lose all isolation (the app refuses a same-origin frame URL anyway).

## 1. Deploy on Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Project name `openhr-ads`, upload this `ads-frame/` folder (`index.html`, `_headers`, and
   your Zoho banner image). You get `https://openhr-ads.pages.dev`.
   (Or connect the GitHub repo: build command empty, build output directory `ads-frame`.)
3. Project → **Custom domains** → **Set up a custom domain** → `ads.openhrapp.com`.
   - If `openhrapp.com` DNS is on Cloudflare, it creates the CNAME for you.
   - If DNS is elsewhere, add a CNAME `ads` → `openhr-ads.pages.dev` at that DNS provider.
4. Wait for the certificate (a few minutes), then open `https://ads.openhrapp.com`. With nothing
   configured you should see the "Remove ads" house link.

## 2. Fill in the ad networks (top of `index.html`)

| Entry | Where to get it |
|---|---|
| `adsterra.key` | Adsterra → Websites → add `ads.openhrapp.com` → Banner **320x50** → copy the `key` from the code |
| `aads.unit` | a-ads.com → Create ad unit → site `ads.openhrapp.com`, size Adaptive → the unit number |
| `image.href` + `img` | Zoho affiliate dashboard → banner (320x100) saved into this folder + your affiliate link |

Empty entries are skipped. `weight` sets how often each one is picked per page load.
Re-upload (or push) after every change.

## 3. Switch it on in the app

1. Vercel → Project → Settings → Environment Variables:
   `VITE_AD_FRAME_URL = https://ads.openhrapp.com` (Production), then redeploy.
2. Super Admin → Ads: the `dashboard-below-cards` slot must be enabled for the organization.
3. Only organizations on the ad-supported plan see it; paid plans never load the frame.

Before going live, update the Privacy Policy: it currently says advertising never runs on
signed-in screens. State that the employee dashboard shows ads from Adsterra and A-Ads inside
an isolated frame, and that those networks receive the viewer's IP address and browser details.

## Rules

- The frame is only on the employee dashboard, never on attendance, camera or leave screens.
- `_headers` limits who may embed this page (`frame-ancestors`). Add any new app domain there.
- If the app domain is not `openhrapp.com`, change `HOUSE.href` and `_headers` to match.
