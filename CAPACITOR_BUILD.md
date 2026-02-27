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
This copies `dist/` into `android/app/src/main/assets/public/` and syncs the Capacitor config.

### Step 3: Open in Android Studio
```bash
npm run cap:open
```

### Step 4: Generate signed APK
In Android Studio: **Build > Generate Signed Bundle / APK > APK**

### Step 5: Distribute
Copy the generated APK to `public/downloads/openhrapp.apk`, commit, and push.

## When to Rebuild the APK

Rebuild the APK whenever:
- **UI or logic changes** are made (the app loads bundled assets, not a remote URL)
- Adding new Capacitor plugins (e.g., camera, push notifications)
- Changing the app ID, name, or icons
- Changing native Android permissions

## Important Notes

- **Do NOT** add `server.url` to `capacitor.config.ts` — this would make the app load a remote website instead of local assets, causing browser-like behavior and white screen issues.
- Always run `npm run cap:sync` after `npm run build` before opening Android Studio.
