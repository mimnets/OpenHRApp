// OpenHRApp — Registration Edge Function
// Ports: Others/pb_hooks/main.pb.js → POST /api/openhr/register
// Deno runtime (Supabase Edge Functions)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Cloudflare Turnstile verification ───────────────────────────────────────
// Deliberately inlined rather than imported from ../_shared/. The Docker-less
// API deploy path failed to boot with a cross-directory relative import, and a
// registration endpoint that will not start is worse than a duplicated helper.
//
// siteverify returning success only proves the token is a real, unspent
// Turnstile token — not that it came from our widget on our site. `action` and
// `hostname` are what bind it to this surface; without them the token is a
// bearer credential anyone can farm against the same sitekey.

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_TIMEOUT_MS = 10000;
const TURNSTILE_MAX_TOKEN = 2048;
const TURNSTILE_DEFAULT_HOSTS = ['openhrapp.com', 'www.openhrapp.com'];

function callerIp(req: Request): string | null {
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? null;
}

async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
  expectedAction = 'register',
): Promise<{ ok: boolean; message?: string }> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set — verification skipped');
    return { ok: true };
  }

  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, message: 'Please complete the anti-spam check.' };
  }
  if (token.length > TURNSTILE_MAX_TOKEN) {
    console.warn(`[turnstile] oversized token rejected (${token.length} chars)`);
    return { ok: false, message: 'Anti-spam check failed. Please try again.' };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  let data: { success: boolean; action?: string; hostname?: string; 'error-codes'?: string[] };
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    data = await res.json();
  } catch (e) {
    // Fail closed: a Cloudflare outage must not reopen the endpoint spam targets.
    console.error('[turnstile] siteverify failed:', e instanceof Error ? e.message : e);
    return { ok: false, message: 'Anti-spam check unavailable. Please try again shortly.' };
  }

  if (!data.success) {
    console.warn('[turnstile] rejected:', data['error-codes']?.join(',') ?? 'unknown');
    return { ok: false, message: 'Anti-spam check failed. Please try again.' };
  }
  if (data.action !== expectedAction) {
    console.warn(`[turnstile] action mismatch: got "${data.action}", expected "${expectedAction}"`);
    return { ok: false, message: 'Anti-spam check failed. Please try again.' };
  }

  const rawHosts = Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES');
  const allowed = new Set(
    rawHosts
      ? rawHosts.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
      : TURNSTILE_DEFAULT_HOSTS,
  );
  if (!data.hostname || !allowed.has(data.hostname.toLowerCase())) {
    console.warn(`[turnstile] hostname "${data.hostname}" not in allowlist`);
    return { ok: false, message: 'Anti-spam check failed. Please try again.' };
  }

  return { ok: true };
}

// ── Country defaults ────────────────────────────────────────────────────────
function getCountryDefaults(code: string) {
  const defaults: Record<string, { currency: string; timezone: string; workingDays: string[]; dateFormat: string }> = {
    BD: { currency: 'BDT', timezone: 'Asia/Dhaka', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
    IN: { currency: 'INR', timezone: 'Asia/Kolkata', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], dateFormat: 'DD/MM/YYYY' },
    NP: { currency: 'NPR', timezone: 'Asia/Kathmandu', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    PK: { currency: 'PKR', timezone: 'Asia/Karachi', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], dateFormat: 'DD/MM/YYYY' },
    LK: { currency: 'LKR', timezone: 'Asia/Colombo', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    MY: { currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    SG: { currency: 'SGD', timezone: 'Asia/Singapore', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    ID: { currency: 'IDR', timezone: 'Asia/Jakarta', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    TH: { currency: 'THB', timezone: 'Asia/Bangkok', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    VN: { currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    PH: { currency: 'PHP', timezone: 'Asia/Manila', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'MM/DD/YYYY' },
    JP: { currency: 'JPY', timezone: 'Asia/Tokyo', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'YYYY/MM/DD' },
    KR: { currency: 'KRW', timezone: 'Asia/Seoul', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'YYYY/MM/DD' },
    CN: { currency: 'CNY', timezone: 'Asia/Shanghai', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'YYYY/MM/DD' },
    HK: { currency: 'HKD', timezone: 'Asia/Hong_Kong', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    TW: { currency: 'TWD', timezone: 'Asia/Taipei', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'YYYY/MM/DD' },
    AE: { currency: 'AED', timezone: 'Asia/Dubai', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    SA: { currency: 'SAR', timezone: 'Asia/Riyadh', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
    QA: { currency: 'QAR', timezone: 'Asia/Qatar', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
    KW: { currency: 'KWD', timezone: 'Asia/Kuwait', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
    BH: { currency: 'BHD', timezone: 'Asia/Bahrain', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
    OM: { currency: 'OMR', timezone: 'Asia/Muscat', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
    IL: { currency: 'ILS', timezone: 'Asia/Jerusalem', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
    TR: { currency: 'TRY', timezone: 'Europe/Istanbul', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    GB: { currency: 'GBP', timezone: 'Europe/London', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    IE: { currency: 'EUR', timezone: 'Europe/Dublin', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    DE: { currency: 'EUR', timezone: 'Europe/Berlin', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD.MM.YYYY' },
    FR: { currency: 'EUR', timezone: 'Europe/Paris', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    IT: { currency: 'EUR', timezone: 'Europe/Rome', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    ES: { currency: 'EUR', timezone: 'Europe/Madrid', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    NL: { currency: 'EUR', timezone: 'Europe/Amsterdam', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD-MM-YYYY' },
    BE: { currency: 'EUR', timezone: 'Europe/Brussels', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    AT: { currency: 'EUR', timezone: 'Europe/Vienna', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD.MM.YYYY' },
    CH: { currency: 'CHF', timezone: 'Europe/Zurich', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD.MM.YYYY' },
    SE: { currency: 'SEK', timezone: 'Europe/Stockholm', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'YYYY-MM-DD' },
    NO: { currency: 'NOK', timezone: 'Europe/Oslo', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD.MM.YYYY' },
    DK: { currency: 'DKK', timezone: 'Europe/Copenhagen', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD-MM-YYYY' },
    FI: { currency: 'EUR', timezone: 'Europe/Helsinki', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD.MM.YYYY' },
    US: { currency: 'USD', timezone: 'America/New_York', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'MM/DD/YYYY' },
    CA: { currency: 'CAD', timezone: 'America/Toronto', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'MM/DD/YYYY' },
    MX: { currency: 'MXN', timezone: 'America/Mexico_City', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    BR: { currency: 'BRL', timezone: 'America/Sao_Paulo', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    AR: { currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    AU: { currency: 'AUD', timezone: 'Australia/Sydney', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    NZ: { currency: 'NZD', timezone: 'Pacific/Auckland', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    NG: { currency: 'NGN', timezone: 'Africa/Lagos', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
    EG: { currency: 'EGP', timezone: 'Africa/Cairo', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
    ZA: { currency: 'ZAR', timezone: 'Africa/Johannesburg', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'YYYY/MM/DD' },
    KE: { currency: 'KES', timezone: 'Africa/Nairobi', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
  };
  return defaults[code] ?? { currency: 'USD', timezone: 'UTC', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' };
}

// ── Holiday data (ported from main.pb.js loadHolidaysForCountry) ────────────
function getHolidays(code: string): Array<{ id: string; date: string; name: string; isGovernment: boolean; type: string }> {
  const data: Record<string, Array<{ id: string; date: string; name: string; isGovernment: boolean; type: string }>> = {
    BD: [
      { id:'bd-h1', date:'2026-02-21', name:'International Mother Language Day', isGovernment:true, type:'NATIONAL' },
      { id:'bd-h2', date:'2026-03-17', name:"Sheikh Mujibur Rahman's Birthday", isGovernment:true, type:'NATIONAL' },
      { id:'bd-h3', date:'2026-03-26', name:'Independence Day', isGovernment:true, type:'NATIONAL' },
      { id:'bd-h4', date:'2026-04-14', name:'Pohela Boishakh (Bengali New Year)', isGovernment:true, type:'FESTIVAL' },
      { id:'bd-h5', date:'2026-05-01', name:'May Day', isGovernment:true, type:'NATIONAL' },
      { id:'bd-h6', date:'2026-08-15', name:'National Mourning Day', isGovernment:true, type:'NATIONAL' },
      { id:'bd-h7', date:'2026-12-16', name:'Victory Day', isGovernment:true, type:'NATIONAL' },
      { id:'bd-h8', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    IN: [
      { id:'in-h1', date:'2026-01-26', name:'Republic Day', isGovernment:true, type:'NATIONAL' },
      { id:'in-h2', date:'2026-03-04', name:'Holi', isGovernment:true, type:'FESTIVAL' },
      { id:'in-h3', date:'2026-04-03', name:'Good Friday', isGovernment:true, type:'FESTIVAL' },
      { id:'in-h4', date:'2026-08-15', name:'Independence Day', isGovernment:true, type:'NATIONAL' },
      { id:'in-h5', date:'2026-10-02', name:'Gandhi Jayanti', isGovernment:true, type:'NATIONAL' },
      { id:'in-h6', date:'2026-10-20', name:'Dussehra', isGovernment:true, type:'FESTIVAL' },
      { id:'in-h7', date:'2026-11-08', name:'Diwali', isGovernment:true, type:'FESTIVAL' },
      { id:'in-h8', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    PK: [
      { id:'pk-h1', date:'2026-02-05', name:'Kashmir Solidarity Day', isGovernment:true, type:'NATIONAL' },
      { id:'pk-h2', date:'2026-03-23', name:'Pakistan Day', isGovernment:true, type:'NATIONAL' },
      { id:'pk-h3', date:'2026-05-01', name:'Labour Day', isGovernment:true, type:'NATIONAL' },
      { id:'pk-h4', date:'2026-08-14', name:'Independence Day', isGovernment:true, type:'NATIONAL' },
      { id:'pk-h5', date:'2026-11-09', name:'Iqbal Day', isGovernment:true, type:'NATIONAL' },
      { id:'pk-h6', date:'2026-12-25', name:'Quaid-e-Azam Day', isGovernment:true, type:'NATIONAL' },
    ],
    AE: [
      { id:'ae-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'ae-h2', date:'2026-12-01', name:'Commemoration Day', isGovernment:true, type:'NATIONAL' },
      { id:'ae-h3', date:'2026-12-02', name:'National Day', isGovernment:true, type:'NATIONAL' },
      { id:'ae-h4', date:'2026-12-03', name:'National Day Holiday', isGovernment:true, type:'NATIONAL' },
    ],
    SA: [
      { id:'sa-h1', date:'2026-02-22', name:'Foundation Day', isGovernment:true, type:'NATIONAL' },
      { id:'sa-h2', date:'2026-09-23', name:'Saudi National Day', isGovernment:true, type:'NATIONAL' },
    ],
    GB: [
      { id:'gb-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'gb-h2', date:'2026-04-03', name:'Good Friday', isGovernment:true, type:'FESTIVAL' },
      { id:'gb-h3', date:'2026-04-06', name:'Easter Monday', isGovernment:true, type:'FESTIVAL' },
      { id:'gb-h4', date:'2026-05-04', name:'Early May Bank Holiday', isGovernment:true, type:'NATIONAL' },
      { id:'gb-h5', date:'2026-05-25', name:'Spring Bank Holiday', isGovernment:true, type:'NATIONAL' },
      { id:'gb-h6', date:'2026-08-31', name:'Summer Bank Holiday', isGovernment:true, type:'NATIONAL' },
      { id:'gb-h7', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
      { id:'gb-h8', date:'2026-12-28', name:'Boxing Day (Substitute)', isGovernment:true, type:'FESTIVAL' },
    ],
    US: [
      { id:'us-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'us-h2', date:'2026-01-19', name:'Martin Luther King Jr. Day', isGovernment:true, type:'NATIONAL' },
      { id:'us-h3', date:'2026-02-16', name:"Presidents' Day", isGovernment:true, type:'NATIONAL' },
      { id:'us-h4', date:'2026-05-25', name:'Memorial Day', isGovernment:true, type:'NATIONAL' },
      { id:'us-h5', date:'2026-06-19', name:'Juneteenth', isGovernment:true, type:'NATIONAL' },
      { id:'us-h6', date:'2026-07-04', name:'Independence Day', isGovernment:true, type:'NATIONAL' },
      { id:'us-h7', date:'2026-09-07', name:'Labor Day', isGovernment:true, type:'NATIONAL' },
      { id:'us-h8', date:'2026-10-12', name:'Columbus Day', isGovernment:true, type:'NATIONAL' },
      { id:'us-h9', date:'2026-11-11', name:'Veterans Day', isGovernment:true, type:'NATIONAL' },
      { id:'us-h10', date:'2026-11-26', name:'Thanksgiving Day', isGovernment:true, type:'NATIONAL' },
      { id:'us-h11', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    CA: [
      { id:'ca-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'ca-h2', date:'2026-04-03', name:'Good Friday', isGovernment:true, type:'FESTIVAL' },
      { id:'ca-h3', date:'2026-05-18', name:'Victoria Day', isGovernment:true, type:'NATIONAL' },
      { id:'ca-h4', date:'2026-07-01', name:'Canada Day', isGovernment:true, type:'NATIONAL' },
      { id:'ca-h5', date:'2026-09-07', name:'Labour Day', isGovernment:true, type:'NATIONAL' },
      { id:'ca-h6', date:'2026-10-12', name:'Thanksgiving', isGovernment:true, type:'NATIONAL' },
      { id:'ca-h7', date:'2026-11-11', name:'Remembrance Day', isGovernment:true, type:'NATIONAL' },
      { id:'ca-h8', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    AU: [
      { id:'au-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'au-h2', date:'2026-01-26', name:'Australia Day', isGovernment:true, type:'NATIONAL' },
      { id:'au-h3', date:'2026-04-03', name:'Good Friday', isGovernment:true, type:'FESTIVAL' },
      { id:'au-h4', date:'2026-04-06', name:'Easter Monday', isGovernment:true, type:'FESTIVAL' },
      { id:'au-h5', date:'2026-04-25', name:'Anzac Day', isGovernment:true, type:'NATIONAL' },
      { id:'au-h6', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    DE: [
      { id:'de-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'de-h2', date:'2026-04-03', name:'Good Friday', isGovernment:true, type:'FESTIVAL' },
      { id:'de-h3', date:'2026-04-06', name:'Easter Monday', isGovernment:true, type:'FESTIVAL' },
      { id:'de-h4', date:'2026-05-01', name:'Labour Day', isGovernment:true, type:'NATIONAL' },
      { id:'de-h5', date:'2026-10-03', name:'German Unity Day', isGovernment:true, type:'NATIONAL' },
      { id:'de-h6', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
      { id:'de-h7', date:'2026-12-26', name:"St. Stephen's Day", isGovernment:true, type:'FESTIVAL' },
    ],
    SG: [
      { id:'sg-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'sg-h2', date:'2026-02-17', name:'Chinese New Year', isGovernment:true, type:'FESTIVAL' },
      { id:'sg-h3', date:'2026-04-03', name:'Good Friday', isGovernment:true, type:'FESTIVAL' },
      { id:'sg-h4', date:'2026-05-01', name:'Labour Day', isGovernment:true, type:'NATIONAL' },
      { id:'sg-h5', date:'2026-08-09', name:'National Day', isGovernment:true, type:'NATIONAL' },
      { id:'sg-h6', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    MY: [
      { id:'my-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'my-h2', date:'2026-05-01', name:'Labour Day', isGovernment:true, type:'NATIONAL' },
      { id:'my-h3', date:'2026-08-31', name:'Merdeka (National Day)', isGovernment:true, type:'NATIONAL' },
      { id:'my-h4', date:'2026-09-16', name:'Malaysia Day', isGovernment:true, type:'NATIONAL' },
      { id:'my-h5', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    ZA: [
      { id:'za-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'za-h2', date:'2026-03-21', name:'Human Rights Day', isGovernment:true, type:'NATIONAL' },
      { id:'za-h3', date:'2026-04-27', name:'Freedom Day', isGovernment:true, type:'NATIONAL' },
      { id:'za-h4', date:'2026-05-01', name:"Workers' Day", isGovernment:true, type:'NATIONAL' },
      { id:'za-h5', date:'2026-06-16', name:'Youth Day', isGovernment:true, type:'NATIONAL' },
      { id:'za-h6', date:'2026-12-16', name:'Day of Reconciliation', isGovernment:true, type:'NATIONAL' },
      { id:'za-h7', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    NG: [
      { id:'ng-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'ng-h2', date:'2026-05-01', name:"Workers' Day", isGovernment:true, type:'NATIONAL' },
      { id:'ng-h3', date:'2026-10-01', name:'Independence Day', isGovernment:true, type:'NATIONAL' },
      { id:'ng-h4', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
    KE: [
      { id:'ke-h1', date:'2026-01-01', name:"New Year's Day", isGovernment:true, type:'NATIONAL' },
      { id:'ke-h2', date:'2026-05-01', name:'Labour Day', isGovernment:true, type:'NATIONAL' },
      { id:'ke-h3', date:'2026-06-01', name:'Madaraka Day', isGovernment:true, type:'NATIONAL' },
      { id:'ke-h4', date:'2026-12-12', name:'Jamhuri Day', isGovernment:true, type:'NATIONAL' },
      { id:'ke-h5', date:'2026-12-25', name:'Christmas Day', isGovernment:true, type:'FESTIVAL' },
    ],
  };
  return data[code] ?? [];
}

// ── Email helper ─────────────────────────────────────────────────────────────
async function sendSuperAdminRegistrationEmail(
  superAdmins: Array<{ id: string; email: string | null }>,
  orgName: string,
  adminName: string,
  email: string,
  country: string,
  trialEndDate: Date,
): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.warn('[REGISTER] RESEND_API_KEY not set — skipping email notification');
    return;
  }

  const FROM_EMAIL = 'OpenHRApp <noreply@openhrapp.com>';

  // Filter to super admins who have an email in their profile.
  // We use profiles.email directly (backfilled by migration 0013 + handle_new_user trigger)
  // instead of the expensive+paginated auth.admin.listUsers() round-trip.
  const withEmail = superAdmins.filter(sa => sa.email);
  if (withEmail.length === 0) {
    console.warn('[REGISTER] No super admins with email in profiles — skipping email notification');
    return;
  }
  console.log(`[REGISTER] Sending registration email to ${withEmail.length} super admin(s)`);

  const trialDateStr = trialEndDate.toISOString().split('T')[0];
  const subject = `New org registered: ${orgName}`;
  const html = `
    <h2>New Organization Registration</h2>
    <p>A new organization has registered on OpenHRApp:</p>
    <table style="border-collapse:collapse;width:100%;max-width:500px">
      <tr><td style="padding:6px 12px;font-weight:bold">Organization</td><td>${orgName}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold">Admin</td><td>${adminName}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td>${email}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold">Country</td><td>${country}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold">Trial Ends</td><td>${trialDateStr}</td></tr>
    </table>
    <p style="margin-top:16px">
      <a href="https://app.openhr.app" style="color:#4f46e5">Open Super Admin Dashboard</a>
    </p>
  `;

  for (const sa of withEmail) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [sa.email],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        console.error(`[REGISTER] Email to super admin ${sa.id} (${sa.email}) failed: ${res.status} ${await res.text()}`);
      } else {
        console.log(`[REGISTER] Email sent to super admin ${sa.id} (${sa.email})`);
      }
    } catch (e) {
      console.error(`[REGISTER] Email to super admin ${sa.id} error:`, e);
    }
  }
}

// ── Verification code email ─────────────────────────────────────────────────
async function sendVerificationCodeEmail(email: string, code: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.error('[REGISTER] RESEND_API_KEY not set — cannot send verification code');
    return false;
  }
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h2 style="margin:0 0 12px">Verify your email</h2>
      <p>Use this code to finish creating your organization on OpenHRApp:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#eef2ff;color:#4f46e5;padding:16px;text-align:center;border-radius:10px;font-family:monospace">${code}</p>
      <p style="color:#64748b;font-size:13px">Enter it on the registration page soon, as it expires. If you did not try to sign up, ignore this email and nothing will be created.</p>
    </div>
  `;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'OpenHRApp <noreply@openhrapp.com>',
        to: [email],
        subject: `${code} is your OpenHRApp verification code`,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`[REGISTER] Verification email failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[REGISTER] Verification email error:', e);
    return false;
  }
}

// Step 1 of registration: prove the caller owns the email before anything
// else is created. Only an unconfirmed auth user (and the empty profile row the
// handle_new_user trigger adds) exists until the code is entered.
async function handleStart(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  formData: FormData,
): Promise<Response> {
  const email   = formData.get('email')?.toString()?.trim().toLowerCase() ?? '';
  const tsToken = formData.get('turnstileToken')?.toString() ?? '';
  const ip      = callerIp(req);

  const turnstileResult = await verifyTurnstile(tsToken, ip, 'register');
  if (!turnstileResult.ok) {
    console.warn(`[REGISTER] Turnstile rejected code request from ${ip ?? 'unknown IP'}`);
    return jsonError(400, turnstileResult.message ?? 'Anti-spam check failed.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return jsonError(400, 'Please enter a valid email address.');
  }

  // Each code sent counts as an attempt, so resends are capped too.
  const { data: allowed, error: rlErr } = await supabase
    .rpc('check_registration_rate_limit', { p_email: email, p_ip: ip });
  if (rlErr) {
    console.error('[REGISTER] Rate-limit check failed:', rlErr.message);
  } else if (allowed === false) {
    console.warn(`[REGISTER] Rate limit hit for ${email} / ${ip ?? 'unknown IP'}`);
    return jsonError(429, 'Too many attempts. Please try again in an hour.');
  }

  // A profile row exists for every auth user (handle_new_user trigger), so
  // "already registered" means it belongs to an organization or a Super Admin.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, organization_id, role')
    .eq('email', email)
    .maybeSingle();
  if (existingProfile && (existingProfile.organization_id || existingProfile.role === 'SUPER_ADMIN')) {
    return jsonError(409, 'This email is already registered. Please sign in instead.');
  }

  if (!existingProfile) {
    const { error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + crypto.randomUUID(), // replaced in step 3
      email_confirm: false,
    });
    // An auth user without a profile row means a half-finished earlier attempt.
    if (createErr && !/already|exists/i.test(createErr.message)) {
      console.error('[REGISTER] createUser failed:', createErr.message);
      return jsonError(400, 'Could not start registration. Please try again.');
    }
  }

  const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  const code = link?.properties?.email_otp;
  if (linkErr || !code) {
    console.error('[REGISTER] generateLink failed:', linkErr?.message ?? 'no email_otp returned');
    return jsonError(500, 'Could not create a verification code. Please try again.');
  }

  if (!(await sendVerificationCodeEmail(email, code))) {
    return jsonError(502, 'Could not send the verification email. Please try again shortly.');
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Verification code sent.' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Service-role client — bypasses RLS for admin setup operations
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Parse multipart FormData
    const formData = await req.formData();
    if (formData.get('step')?.toString() === 'start') {
      return await handleStart(supabase, req, formData);
    }

    const orgName   = formData.get('orgName')?.toString()?.trim() ?? '';
    const adminName = formData.get('adminName')?.toString()?.trim() ?? '';
    const password  = formData.get('password')?.toString() ?? '';
    const country   = (formData.get('country')?.toString()?.trim().toUpperCase() ?? 'BD');
    const address   = formData.get('address')?.toString()?.trim() ?? '';
    const logoFile  = formData.get('logo') instanceof File ? formData.get('logo') as File : null;

    // ── Verified caller ───────────────────────────────────────────────────
    // Step 2 (the emailed code) signs the caller in; that session token is the
    // proof of email ownership, so Turnstile and the rate limit already ran in
    // step 1. The email comes from the token, never from the form.
    const accessToken = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const { data: { user: authUser } } = await supabase.auth.getUser(accessToken);
    if (!authUser?.email || !authUser.email_confirmed_at) {
      return jsonError(401, 'Please verify your email first.');
    }
    const userId = authUser.id;
    const email  = authUser.email.toLowerCase();

    // ── Validate ──────────────────────────────────────────────────────────
    if (!orgName || !adminName || !password) {
      return jsonError(400, 'Missing required fields: orgName, adminName, or password.');
    }
    if (password.length < 8) {
      return jsonError(400, 'Password must be at least 8 characters.');
    }
    if (country.length !== 2) {
      return jsonError(400, 'Invalid country code. Must be 2-letter ISO code (e.g., BD, US, IN).');
    }

    // ── Already registered? ───────────────────────────────────────────────
    // handle_new_user gives every auth user a profile row; one that already
    // belongs to an organization (or a Super Admin) must not be re-pointed.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .maybeSingle();
    if (existingProfile?.organization_id || existingProfile?.role === 'SUPER_ADMIN') {
      return jsonError(409, 'This email is already registered. Please sign in instead.');
    }

    // ── Create Organization ───────────────────────────────────────────────
    const trialEndDate = new Date();
    trialEndDate.setUTCHours(0, 0, 0, 0);
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        country,
        address,
        subscription_status: 'TRIAL',
        trial_end_date: trialEndDate.toISOString(),
      })
      .select('id')
      .single();

    if (orgError || !org) {
      return jsonError(400, 'Database Error (Organization): ' + orgError?.message);
    }

    const orgId = org.id;

    // ── Upload logo (non-fatal) ───────────────────────────────────────────
    let logoPath: string | null = null;
    if (logoFile && logoFile.size > 0) {
      try {
        const ext = logoFile.name.split('.').pop() ?? 'webp';
        const path = `${orgId}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('org-logos')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (!uploadError) {
          logoPath = path;
          await supabase.from('organizations').update({ logo: logoPath }).eq('id', orgId);
        }
      } catch (logoErr) {
        console.warn('[REGISTER] Logo upload failed (non-fatal):', logoErr);
      }
    }

    // ── Set the admin's password ──────────────────────────────────────────
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { name: adminName },
    });

    if (authError) {
      // Rollback org
      await supabase.from('organizations').delete().eq('id', orgId);
      return jsonError(400, 'Database Error (User): ' + authError.message);
    }

    // ── Create Profile ────────────────────────────────────────────────────
    const randId   = Math.floor(1000 + Math.random() * 9000);
    const ts       = Date.now().toString().slice(-4);
    const adminId  = `ADM-${ts}-${randId}`;

    const { error: profileError } = await supabase.from('profiles').upsert({
      id:              userId,
      organization_id: orgId,
      name:            adminName,
      email,
      role:            'ADMIN',
      employee_id:     adminId,
      designation:     'System Admin',
      department:      'Management',
      verified:        true,
    });

    if (profileError) {
      console.error('[REGISTER] Profile creation error (non-fatal):', profileError.message);
    }

    // ── Initialize Default Settings ───────────────────────────────────────
    try {
      const countryDefaults = getCountryDefaults(country);
      const holidays        = getHolidays(country);

      const settingsToInsert = [
        {
          organization_id: orgId,
          key: 'app_config',
          value: JSON.stringify({
            companyName:           orgName,
            currency:              countryDefaults.currency,
            timezone:              countryDefaults.timezone,
            dateFormat:            countryDefaults.dateFormat,
            workingDays:           countryDefaults.workingDays,
            officeStartTime:       '09:00',
            officeEndTime:         '18:00',
            lateGracePeriod:       15,
            earlyOutGracePeriod:   15,
            earliestCheckIn:       '06:00',
            autoSessionCloseTime:  '23:59',
            autoAbsentEnabled:     true,
            autoAbsentTime:        '23:55',
          }),
        },
        { organization_id: orgId, key: 'holidays',     value: JSON.stringify(holidays) },
        { organization_id: orgId, key: 'departments',  value: JSON.stringify(['Engineering','HR','Sales','Marketing','Operations','Finance','Management']) },
        { organization_id: orgId, key: 'designations', value: JSON.stringify(['Manager','Lead','Senior','Associate','Junior','Intern']) },
        {
          organization_id: orgId,
          key: 'leave_policy',
          value: JSON.stringify({ defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 }, overrides: {} }),
        },
      ];

      await supabase.from('settings').insert(settingsToInsert);
    } catch (settingsErr) {
      console.error('[REGISTER] Settings init failed (non-fatal):', settingsErr);
    }

    // ── Notify Super Admins (non-fatal) ───────────────────────────────────
    try {
      const { data: superAdmins } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'SUPER_ADMIN');

      if (superAdmins && superAdmins.length > 0) {
        const notifications = superAdmins.map(sa => ({
          user_id:         sa.id,
          organization_id: orgId,
          type:            'NEW_REGISTRATION',
          title:           `New org registered: ${orgName}`,
          message:         `Admin: ${adminName} (${email}) | Country: ${country} | Trial ends: ${trialEndDate.toISOString().split('T')[0]}`,
          priority:        'HIGH',
          reference_type:  'organization',
          reference_id:    orgId,
          action_url:      'super-admin',
        }));
        await supabase.from('notifications').insert(notifications);

        // Also send email to super admins (non-fatal)
        try {
          await sendSuperAdminRegistrationEmail(
            superAdmins, orgName, adminName, email, country, trialEndDate,
          );
        } catch (emailErr) {
          console.warn('[REGISTER] Super admin email failed (non-fatal):', emailErr);
        }
      }
    } catch (notifErr) {
      console.warn('[REGISTER] Super admin notification failed (non-fatal):', notifErr);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Organization created.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[REGISTER] Unhandled error:', err);
    return jsonError(500, 'Internal Server Error: ' + (err as Error).message);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
