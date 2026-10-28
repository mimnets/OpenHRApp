# Handoff — Verify-email-first organization registration (2026-10-28)

## Status

Built, pushed to `main`, `register` Edge Function deployed by the owner.
**Not yet confirmed end to end**: the test email was delivered by Resend but
never showed in the test Gmail inbox (see Open issues).

| Commit | What |
|---|---|
| `8f20daf` | feat(registration): verify email with a code before the rest of sign-up |
| `60369d3` | fix(registration): don't promise a 6-digit code (UI wording) |

Approved proposal (mockups, flow, edge cases): https://claude.ai/artifact/R5uyDcFcnF5cvHejCkCrok
(It still says "6-digit" and "10 minutes"; the real expiry is 1 hour.)

## New flow

1. **Email** — work email + Turnstile → `register` function with `step=start`.
   It runs Turnstile, `check_registration_rate_limit` (3/hour per email, 5/hour per IP,
   so resends count), refuses emails whose profile already has an organization or is
   SUPER_ADMIN, creates an unconfirmed auth user if needed, gets the code from
   `auth.admin.generateLink({ type: 'magiclink' }).properties.email_otp` and emails it
   via Resend from `noreply@openhrapp.com`.
2. **Code** — `verifyOtp({ email, token, type: 'email' })` on a **separate,
   non-persisting Supabase client** (`getRegistrationClient` in `auth.service.ts`).
   The main app client never sees this session, so sessionManager/AuthContext are
   untouched and a refresh simply restarts sign-up. Resend after 60 s.
3. **Details** — org name, country, admin name, password. Sent with the step-2
   access token as `Authorization`. The function takes the email from the token,
   requires `email_confirmed_at`, refuses if the profile already has an org, sets the
   password (`admin.updateUserById`), then creates org / profile (`verified: true`) /
   settings / super-admin notifications as before.
4. **Done** — "Go to dashboard" calls the normal `hrService.login` → `onSuccess(user)`.

Logo and address were removed from sign-up; the "Set Company Info" setup-checklist
step already covers them. The function still accepts them if sent.

## Files

- `src/pages/RegisterOrganization.tsx` — 3-step form
- `src/services/auth.service.ts` — `startRegistration`, `verifyRegistrationCode`,
  `registerOrganization` (now takes `accessToken`, no email/logo/address), `invokeRegister`
- `src/services/hrService.ts` — exposes the two new methods
- `supabase/functions/register/index.ts` — `handleStart`, `sendVerificationCodeEmail`,
  session-gated final step
- No migrations. No frozen files touched.

## Supabase settings (project `cixryuwtlwbofabctrkk`)

Authentication → Sign In / Providers → Email:
- Email OTP length: **6** (was 8; changed 2026-10-28)
- Email OTP expiration: **3600 s**

The code input accepts 6–10 digits, so the length setting can change without a code change.

## Deploying the function

The Supabase CLI is not installed on this PC. Either:
- `npx supabase login` then
  `npx supabase functions deploy register --project-ref cixryuwtlwbofabctrkk --use-api`
- or paste `supabase/functions/register/index.ts` into Dashboard → Edge Functions → register → Code → Deploy
  (the file is self-contained on purpose).

## Open issues / next steps

1. **Gmail not showing the code.** Resend shows `Sent → Delivered` for every code email
   to `amdanigo@gmail.com` (e.g. 12:05 PM, code 85288281), yet the owner found nothing in
   inbox or spam. Next: test with a `@vclbd.net` address (those receive leave emails
   fine); check that Gmail's Filters and Blocked Addresses. Resend's only insight was
   "Don't use no-reply" (all app emails share that sender).
2. **End-to-end test** once an email arrives: code → details → dashboard lands in the new org.
3. `src/components/registration/RegistrationVerificationPage.tsx` is unused now;
   deleting it was blocked by permissions. Remove with `git rm`.
4. Abandoned sign-ups leave an unconfirmed (or confirmed) auth user with an empty
   profile (`organization_id` null, role EMPLOYEE). Re-registering with the same email
   resumes cleanly. A cleanup job could prune ones older than N days.
5. Unknown: wrong-code attempt limits are Supabase's own (verify endpoint rate limit),
   not enforced by our code.
