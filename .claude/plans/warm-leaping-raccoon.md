# PocketBase Storage Migration to Cloudflare R2 + .env Setup

## Context
PocketBase currently uses local file storage (`pb_data/storage/`). We're migrating to Cloudflare R2 (S3-compatible) for scalability and to host the APK download. The user also wants R2 credentials added to `.env` files and `.env` protected in `.gitignore`.

## Important: What changes where

**PocketBase S3 config** is done in the **PocketBase Admin Dashboard** (Settings > Files storage > S3), NOT in the frontend codebase. The R2 credentials (endpoint, bucket, keys) are entered there.

**Frontend code** mostly needs NO changes for file URLs — `pb.files.getURL()` and the `/api/files/` pattern continue to work because PocketBase proxies S3 files through its own API. The only frontend change is pointing the APK download to the R2 public URL.

---

## Changes

### 1. Add `.env` entries for R2 credentials
Append R2 variables to `.env.local` (existing file has `GEMINI_API_KEY`).

**File:** `.env.local`
```
# Cloudflare R2 Storage (for PocketBase S3 config reference)
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET=openhrapp-storage
R2_REGION=auto
```

### 2. Create `.env.example` with empty values
New file for developer reference.

**File:** `.env.example`
```
GEMINI_API_KEY=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_REGION=
```

### 3. Add `.env*` to `.gitignore`
Currently NOT gitignored — credentials could be committed. Add entries for all .env variants.

**File:** `.gitignore` — append:
```
# Environment variables
.env
.env.local
.env.production
.env*.local
```

### 4. Update APK download URL to R2 custom domain
Point the "Download APK" button to the R2-hosted APK via custom domain `cdn.openhrapp.com`.

**File:** `src/pages/DownloadPage.tsx`
- Change href from `https://github.com/mimnets/OpenHRApp/releases/latest/download/openhrapp.apk` to `https://cdn.openhrapp.com/openhrapp.apk`
- Update description text accordingly

### 5. Document PocketBase S3 configuration steps
Add a section to `CAPACITOR_BUILD.md` or create a brief note about the R2 setup in PocketBase Admin.

**File:** `CAPACITOR_BUILD.md` — add section:
- PocketBase Admin > Settings > Files storage > Use S3
- Enter: Endpoint, Bucket, Region, Access Key, Secret Key
- Existing files must be manually migrated (copy `pb_data/storage/` contents to R2 bucket preserving folder structure)

### 6. Fix typo in `Others/.env.production`
Currently has `VITE_POCKETBASE_UR` (missing `L`) and a duplicate key with wrong value.

**File:** `Others/.env.production`

---

## What does NOT change (and why)

- **`pb.files.getURL()`** calls in all services — PocketBase auto-generates correct URLs regardless of local vs S3 storage
- **`buildFileUrl()` in blog/tutorial services** — uses `/api/files/` pattern which PocketBase proxies to S3
- **Collection API rules** — S3 doesn't change security; PocketBase still enforces auth rules before serving files
- **File upload code** — PocketBase SDK handles upload to S3 transparently

## Manual Steps (not code changes)

1. **Migrate existing files**: Use `rclone` or AWS CLI to copy `pb_data/storage/` → R2 bucket `openhrapp-storage` preserving the `collectionId/recordId/filename` structure
2. **Configure PocketBase Admin**: Settings > Files storage > S3 with R2 credentials
3. **Upload APK to R2**: Place `openhrapp.apk` in the R2 bucket at a known path
4. **Add env vars to Vercel Dashboard**: Project Settings > Environment Variables (Vercel does NOT read .env files)

## Verification
1. After R2 config in PocketBase Admin: verify avatars, selfies, logos, blog covers load
2. Verify APK download link works from the download page
3. Verify file uploads still work (attendance selfie, profile avatar)
4. Verify `.env.local` is not tracked by git
