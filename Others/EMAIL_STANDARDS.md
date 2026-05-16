# OpenHR — Email Standards

Single source of truth for transactional + bulk mail. Read before touching any mail path.

Last updated: 2026-05-16

---

## 1. Sender identity

| Field | Value |
|---|---|
| Domain | `openhrapp.com` |
| Sender email | `noreply@openhrapp.com` |
| Sender name | `OpenHR` |
| Reply-to (optional) | `support@openhrapp.com` |

Unified across every path. Do not split `support@` vs `noreply@` per template — confuses spam filters and brand.

---

## 2. Transport

**Resend** is the only mail provider. Brevo retired 2026-05-16 (deliverability — landed in spam).

### Routes

| Path | Mechanism | Transport |
|---|---|---|
| **A. User self-serve** (forgot password, signup confirmation, magic link, email change) | Supabase Auth built-in mailer | Resend **SMTP** (`smtp.resend.com:465`) |
| **B. SuperAdmin bulk** (announcements, password reset campaigns) | Edge Function `send-bulk-email` | Resend **HTTPS API** (`api.resend.com/emails/batch`) |
| **C. Cron / system** (daily reports, attendance reminders, trial expiry) | Edge Functions in `supabase/functions/cron-*` | Resend **HTTPS API** |

Same provider, two transports. SMTP for Supabase-managed templates; HTTPS API for code-managed templates.

---

## 3. Path A — User self-serve (Supabase native)

### Why native, not Edge Function

- Built-in rate-limit (`AuthApiError: For security purposes, you can only request this once every 60 seconds`)
- Built-in user-enumeration protection (generic response whether email exists or not)
- hCaptcha integration point if needed later
- Zero cold-start latency
- Token-handling code path battle-tested

### Client code

`src/services/auth.service.ts:79`

```ts
async requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/?reset=1`,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

Recovery hash detection: `src/App.tsx` (commit `c9731d8`) — listens for `PASSWORD_RECOVERY` event AND parses `#type=recovery` from hash.

### Templates

Lives in Supabase Dashboard → **Authentication → Email Templates**.

Five templates to maintain:
1. Confirm Signup
2. Reset Password
3. Magic Link
4. Change Email Address
5. Invite User

Each MUST use `{{ .ConfirmationURL }}` inside `href` — never as visible text only. Example:

```html
<p>
  <a href="{{ .ConfirmationURL }}"
     style="background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;
            text-decoration:none;font-weight:bold;display:inline-block;">
    Reset Password
  </a>
</p>
<p>If button does not work, paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
```

**Common breakage:** anchor renders empty `href=""` → template lost the `{{ .ConfirmationURL }}` binding. Fix in dashboard.

---

## 4. Path B — SuperAdmin bulk (Edge Function)

### Function

`supabase/functions/send-bulk-email/index.ts`

### Why Edge Function

- Batch API (Resend `/emails/batch`) for performance
- Per-recipient personalisation (`{{name}}`, `{{reset_link}}`)
- Audit trail in `reports_queue` table
- Audience filters: ALL_ADMINS, ALL_USERS, ORG, BY_SUBSCRIPTION
- Custom templates source-controlled in `BulkEmailManager.tsx`

### Template placeholders

| Placeholder | Substitution |
|---|---|
| `{{name}}` | First word of `profiles.name`, fallback `User` |
| `{{reset_link}}` | Result of `auth.admin.generateLink({ type: 'recovery', email })` |

Both also accept URL-encoded form `%7B%7Bname%7D%7D` (commit `4d62454`) because rich-text editor encodes them.

### Constraints

- SUPER_ADMIN role required (verified server-side)
- Max 5000 recipients per campaign
- Batch size 100 per Resend call

---

## 5. Path C — Cron / system

Same pattern as Path B. Use Resend HTTPS API directly inside Edge Function. Service-role Supabase client for DB writes.

Existing functions:
- `cron-daily-report` — daily summary emails
- `cron-attendance-reminders` — check-in nudges
- `cron-expire-trials` — trial expiry notice
- `cron-review-transitions` — performance review state changes
- `cron-auto-close-sessions` — silent (no email)
- `cron-auto-absent` — silent (no email)

All deployed 2026-05-15. Auth via `CRON_SECRET` env var (rotated 2026-05-15).

---

## 6. DNS configuration

Required TXT records on `openhrapp.com` (verify in DNS provider):

| Host | Type | Value (canonical) |
|---|---|---|
| `@` | TXT | `v=spf1 include:amazonses.com ~all` |
| `resend._domainkey` | TXT | (DKIM value from Resend dashboard) |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:dmarc@openhrapp.com` |

**Only one `v=spf1` record allowed per domain.** Merge if other providers present.

After 1–2 weeks deliverability stable → tighten DMARC to `p=quarantine`, later `p=reject`.

---

## 7. Supabase SMTP configuration (Path A)

Dashboard → **Auth → SMTP Settings**:

| Field | Value |
|---|---|
| Enable Custom SMTP | ON |
| Sender email | `noreply@openhrapp.com` |
| Sender name | `OpenHR` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `<RESEND_API_KEY>` (starts `re_…`) |
| Min interval | `60` seconds |

Sender domain MUST be verified in Resend or send fails with 403.

---

## 8. Edge Function env (Path B + C)

```
RESEND_API_KEY=re_...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...           # cron paths only
```

Constant in code:
```ts
const FROM_EMAIL = 'OpenHR <noreply@openhrapp.com>';
```

Keep identical across every cron + bulk function.

---

## 9. Redirect URL allowlist

Supabase **Auth → URL Configuration**:

- **Site URL:** `https://www.openhrapp.com`
- **Redirect URLs:** `https://www.openhrapp.com/**`, `http://localhost:5173/**` (dev)

Recovery link `redirectTo` query MUST match an allowlisted pattern or Supabase drops it.

---

## 10. Testing checklist

Before merging any mail change:

- [ ] Test send from staging → personal Gmail → arrives in Inbox (not Spam, not Promotions)
- [ ] Mail-tester.com score ≥ 9/10
- [ ] DKIM pass (check raw headers: `dkim=pass`)
- [ ] SPF pass (`spf=pass`)
- [ ] DMARC pass (`dmarc=pass`)
- [ ] Click link → lands on correct app screen (not landing page)
- [ ] Hash tokens parsed correctly (`#type=recovery` triggers ResetPassword screen)
- [ ] Template renders on Gmail + Outlook + Apple Mail (no broken CSS)

---

## 11. Decisions log

- **2026-05-16** — Adopted Resend for all transactional + bulk. Retired Brevo (spam folder issues).
- **2026-05-16** — Kept Supabase native flow for user self-serve password reset (Path A). Rejected unifying everything under Edge Function due to rate-limit + enumeration burden.
- **2026-05-15** — `send-bulk-email` Edge Function deployed for SuperAdmin (Path B).
- **2026-05-15** — Cron Edge Functions deployed (Path C).

---

## 12. Frequently broken things

| Symptom | Root cause |
|---|---|
| Mail arrives with empty button (no URL) | Template lost `{{ .ConfirmationURL }}` in `href` |
| Reset link drops user on landing page | Missing `PASSWORD_RECOVERY` listener OR redirect URL not allowlisted |
| Mail lands in Spam | DKIM/SPF/DMARC not configured OR sender domain unverified |
| `429 Too Many Requests` from Resend | Use `/emails/batch` endpoint not `/emails` |
| `{{reset_link}}` not replaced in bulk mail | Rich-text editor URL-encoded the placeholder — regex must handle `%7B%7B…%7D%7D` |
| Bulk send returns 403 | Caller missing SUPER_ADMIN role |
| Cron Edge Function 401 | `CRON_SECRET` mismatch between pg_cron job and Edge Function env |

---

## 13. Do not

- ❌ Send mail from app via SMTP credentials in client bundle
- ❌ Hardcode `noreply@openhrapp.com` outside `FROM_EMAIL` constants
- ❌ Add a third mail provider — consolidate on Resend
- ❌ Build a custom password-reset Edge Function to replace Path A — see decisions log
- ❌ Use `git add .` or `git add -A` when committing email changes
