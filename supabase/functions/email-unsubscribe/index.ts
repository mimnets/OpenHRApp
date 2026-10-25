// OpenHRApp — one-click unsubscribe
//
// Public by design: an unsubscribe link that requires a login is not an
// unsubscribe link. The token is HMAC-signed, so the only thing a visitor can
// do is unsubscribe the exact address the link was issued for.
//
// Handles POST as well as GET because RFC 8058 one-click unsubscribe (the
// List-Unsubscribe-Post header) is a POST, and mail clients increasingly use it.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyUnsubscribe } from '../_shared/unsubscribe.ts';

function page(title: string, message: string, ok: boolean): Response {
  const accent = ok ? '#0f766e' : '#b91c1c';
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} — OpenHRApp</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f6f9f8;color:#0e1e1c">
<main style="max-width:34rem;margin:0 auto;padding:4rem 1.5rem">
  <p style="font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#6b807d;margin:0 0 1rem">OpenHRApp</p>
  <h1 style="font-size:1.6rem;line-height:1.2;margin:0 0 .75rem;color:${accent}">${title}</h1>
  <p style="line-height:1.6;color:#3c4f4d;margin:0">${message}</p>
</main></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return page('Not allowed', 'This link only supports viewing or one-click unsubscribe.', false);
  }

  const secret = Deno.env.get('CRON_SECRET');
  if (!secret) {
    console.error('[email-unsubscribe] CRON_SECRET is not configured');
    return page('Something went wrong', 'We could not process this request. Please contact support.', false);
  }

  const url = new URL(req.url);
  let token = url.searchParams.get('token') ?? '';

  // One-click clients POST with the token in the body rather than the query.
  if (!token && req.method === 'POST') {
    try {
      const form = await req.formData();
      token = form.get('token')?.toString() ?? '';
    } catch { /* body may be empty; fall through to the invalid-token page */ }
  }

  const email = await verifyUnsubscribe(token, secret);
  if (!email) {
    return page(
      'This link is not valid',
      'The unsubscribe link looks incomplete or altered. Please use the link exactly as it appears in the email.',
      false,
    );
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await admin.from('email_suppressions').upsert(
    { email, reason: 'UNSUBSCRIBED', note: 'One-click unsubscribe' },
    { onConflict: 'email' },
  );

  if (error) {
    console.error('[email-unsubscribe] suppression write failed:', error.message);
    return page('Something went wrong', 'We could not record your preference. Please contact support.', false);
  }

  console.log(`[email-unsubscribe] suppressed ${email}`);
  return page(
    'You have been unsubscribed',
    `We will not send any more outreach, onboarding or reminder email to <strong>${email}</strong>. ` +
    'Essential account messages, such as password resets, are unaffected.',
    true,
  );
});
