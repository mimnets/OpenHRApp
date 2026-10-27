# Ad frame (ads.openhrapp.com)

A one-page site that shows one rotating banner (Adsterra, A-Ads or a Zoho affiliate banner) on
the employee dashboard. The app embeds it in a sandboxed iframe (`DashboardAdFrame` in
`src/components/ads/AdBanner.tsx`), so ad scripts run on this origin, never on the app's, and
cannot read employee data or the login session.

Who sees it: every organization except those on the paid ad-free plan (`ACTIVE`) and the demo.
What it shows: whatever is set in **Super Admin → Ads → Dashboard Ads**. After the one-time
setup below you never edit or redeploy this folder to change ads.

It is **not** part of the Vite build. Never move it into `public/`: served from the app's own
origin it would lose all isolation (the app refuses a same-origin frame URL anyway).

## One-time setup

1. **Database:** run `supabase/migrations/0042_ad_frame_settings.sql` in the Supabase SQL Editor.
2. **This page:** at the top of the script in `index.html`, fill in `SUPABASE_URL` and
   `SUPABASE_ANON_KEY` with the same values as the app's `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (both are public keys).
3. **Cloudflare Pages** (pick one):
   - *Upload:* Workers & Pages → your `openhr-ads` project → **Create deployment** → upload this
     folder. Repeat only if `index.html` itself changes.
   - *Git (recommended):* Workers & Pages → Create → Pages → **Connect to Git** → this repo,
     build command empty, build output directory `ads-frame`. Then move the custom domain
     `ads.openhrapp.com` to this project and delete the uploaded one. Pushes now redeploy it.
4. **Vercel:** set `VITE_AD_FRAME_URL = https://ads.openhrapp.com` and redeploy the app.
5. **Super Admin → Ads → Dashboard Ads:** enter the Adsterra key (320x50 banner), A-Ads unit
   number and Zoho banner image + affiliate link, switch on the providers you want, switch on
   **All dashboard ads**, and save.

Register `ads.openhrapp.com` as the website in Adsterra and A-Ads.

## Rules

- The frame appears only on the employee dashboard, never on attendance, camera or leave screens.
- `_headers` limits who may embed this page (`frame-ancestors`). Add any new app domain there.
- If the app domain is not `openhrapp.com`, change `HOUSE.href` and `_headers` to match.
