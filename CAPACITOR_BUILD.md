# Capacitor Android APK Build Guide

## First Time APK Build

1. Run `npm run cap:sync` to sync the web project with the Android platform
2. Run `npm run cap:open` to open the project in Android Studio
3. In Android Studio: **Build > Generate Signed Bundle / APK > APK**
4. Copy the generated APK to `public/downloads/openhr.apk`
5. Commit and push to Git — Vercel will serve it automatically at `https://openhrapp.com/downloads/openhr.apk`

## Regular App Updates (UI/Logic Changes)

Just deploy to Vercel normally. The APK loads the live URL (`https://openhrapp.com`) at runtime, so **no APK rebuild is needed** for code or UI changes.

## When to Rebuild the APK

Only rebuild the APK when:

- Adding new Capacitor plugins (e.g., camera, push notifications)
- Changing the app ID, name, or icons
- Changing native Android permissions
