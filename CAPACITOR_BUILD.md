# Capacitor Android APK Build Guide

## How It Works

The APK bundles all web assets locally inside the app. It does NOT load from a remote URL. This ensures:
- The app works offline after install
- No white screen issues from network delays
- True native app feel (no browser behavior)

## Building the APK

### Step 1: Build the web app
```bash
npm run build
```

### Step 2: Sync web assets to Android project
```bash
npm run cap:sync
```
This deletes `dist/downloads/` (to prevent the APK from recursively bundling itself) then copies `dist/` into `android/app/src/main/assets/public/` and syncs the Capacitor config.

### Step 3: Open in Android Studio
```bash
npm run cap:open
```

### Step 4: Generate signed APK
In Android Studio: **Build > Generate Signed Bundle / APK > APK**

### Step 5: Distribute
Upload the signed APK to:
1. **Cloudflare R2** — Upload to the `openhrapp` bucket as `openhrapp.apk` so it's served at `https://cdn.openhrapp.com/openhrapp.apk`
2. **GitHub Releases** — Attach to a new release for version history

Do **not** commit the APK into the repo — `public/downloads/*.apk` is gitignored.
For local Vercel dev, place a copy at `public/downloads/openhrapp.apk` but do not commit it.

## File Storage

PocketBase is configured to use **Cloudflare R2** (S3-compatible) for all file storage (selfies, avatars, blog covers, logos, etc.).

- **Bucket:** `openhrapp`
- **CDN domain:** `cdn.openhrapp.com`
- **How it works:** PocketBase proxies files through `/api/files/` — all existing `pb.files.getURL()` calls work unchanged
- **Configuration:** Managed in PocketBase Admin → Settings → Files storage → S3
- **No frontend code changes needed** — the service layer uses PocketBase SDK which handles the proxy transparently

## When to Rebuild the APK

Rebuild the APK whenever:
- **UI or logic changes** are made (the app loads bundled assets, not a remote URL)
- Adding new Capacitor plugins (e.g., camera, push notifications)
- Changing the app ID, name, or icons
- Changing native Android permissions

## Important Notes

- **Do NOT** add `server.url` to `capacitor.config.ts` — this would make the app load a remote website instead of local assets, causing browser-like behavior and white screen issues.
- Always run `npm run cap:sync` after `npm run build` before opening Android Studio.
