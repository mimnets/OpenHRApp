// Outreach send rules, shared by the outreach-send edge function and tests.
//
// No Deno or Node APIs here: the edge function injects its database and
// Resend calls, so authorization, eligibility, idempotency and rate limiting
// are tested without a live database or a live send.

export const OUTREACH_MAX_PER_HOUR = 10;
export const OUTREACH_MAX_PER_DAY = 40;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// The domain verified in Resend for every existing OpenHRApp sender.
const VERIFIED_SENDER_DOMAIN = 'openhrapp.com';

export interface OutreachProspectRow {
  id: string;
  email: string;
  status: string;
  outreach_basis: string;
  do_not_contact: boolean;
  archived: boolean;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Fills {{var}} placeholders. Unknown variables are left in place so the send check catches them. */
export function renderTemplate(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => {
    const v = vars[k];
    return v == null || v === '' ? m : v;
  });
}

export function hasUnresolvedVariables(s: string): boolean {
  return /\{\{\s*[a-z_]+\s*\}\}/.test(s);
}

/** Returns why this prospect may not be emailed, or null when sending is allowed. */
export function sendBlockReason(p: OutreachProspectRow, suppressed: boolean): string | null {
  if (p.archived) return 'Prospect is archived';
  if (p.do_not_contact) return 'Prospect is marked do-not-contact';
  if (suppressed) return 'Address is on the suppression list (unsubscribed, bounced or complained)';
  if (p.status === 'UNSUBSCRIBED') return 'Prospect has unsubscribed';
  if (p.status === 'NOT_INTERESTED') return 'Prospect is closed as not interested';
  if (p.outreach_basis === 'UNVERIFIED' || !p.outreach_basis) return 'No outreach basis recorded for this contact';
  if (!isValidEmail(p.email)) return 'Recipient address is not valid';
  return null;
}

/** Plain-text body → minimal HTML. Everything user-controlled is escaped. */
export function renderOutreachEmail(opts: {
  body: string;
  unsubscribeUrl: string;
  postalAddress: string;
}): { html: string; text: string } {
  const paras = opts.body.trim().split(/\n{2,}/).map(
    (p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`,
  ).join('');
  const footer = `${escapeHtml(opts.postalAddress)}<br>` +
    `Don't want these emails? <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#6b807d">Unsubscribe</a>.`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0e1e1c;background:#ffffff">` +
    `<div style="max-width:560px">${paras}` +
    `<p style="margin:28px 0 0;padding-top:12px;border-top:1px solid #e2eae8;font-size:12px;color:#6b807d">${footer}</p>` +
    `</div></body></html>`;
  const text = `${opts.body.trim()}\n\n--\n${opts.postalAddress}\nUnsubscribe: ${opts.unsubscribeUrl}\n`;
  return { html, text };
}

export interface OutreachConfig {
  resendApiKey?: string;
  fromEmail?: string;     // e.g. "Monir at OpenHRApp <monir@openhrapp.com>"
  replyTo?: string;
  postalAddress?: string;
  unsubscribeSecret?: string;
}

/** Fail closed: every value must be present and the sender must be on the verified domain. */
export function configProblem(c: OutreachConfig): string | null {
  const missing = (['resendApiKey', 'fromEmail', 'postalAddress', 'unsubscribeSecret'] as const)
    .filter((k) => !c[k]?.trim());
  if (missing.length) return `Outreach sending is not configured: missing ${missing.join(', ')}`;
  const addr = (c.fromEmail!.match(/<([^>]+)>/)?.[1] ?? c.fromEmail!).trim().toLowerCase();
  if (!addr.endsWith(`@${VERIFIED_SENDER_DOMAIN}`) || !isValidEmail(addr)) {
    return `OUTREACH_FROM_EMAIL must be an address on the verified ${VERIFIED_SENDER_DOMAIN} domain`;
  }
  if (/^(no-?reply|noreply)@/.test(addr)) return 'OUTREACH_FROM_EMAIL must be a monitored address, not no-reply';
  if (c.replyTo && !isValidEmail(c.replyTo.trim())) return 'OUTREACH_REPLY_TO is not a valid address';
  return null;
}

export interface SendRequest {
  prospectId: string;
  confirmEmail: string;
  subject: string;
  body: string;
  templateKey?: string | null;
  idempotencyKey: string;
}

export interface SendDeps {
  config: OutreachConfig;
  /** Role of the verified caller, or null when the token is invalid. */
  callerRole(): Promise<{ id: string; role: string } | null>;
  getProspect(id: string): Promise<OutreachProspectRow | null>;
  isSuppressed(email: string): Promise<boolean>;
  /** True when an earlier send to this prospect may have reached Resend but its outcome is unknown. */
  hasPendingSince(prospectId: string, iso: string): Promise<boolean>;
  countOutboundSince(iso: string): Promise<number>;
  /** Inserts a SENDING row; returns null when the idempotency key already exists. */
  claim(row: Record<string, unknown>): Promise<{ id: string } | null>;
  finish(id: string, patch: Record<string, unknown>): Promise<void>;
  markContacted(prospectId: string, at: string): Promise<void>;
  unsubscribeUrl(email: string): Promise<string>;
  /** `unknown` = no definitive answer (timeout, network, 5xx): Resend may have accepted it. */
  resend(payload: Record<string, unknown>, idempotencyKey: string): Promise<{ id?: string; error?: string; unknown?: boolean }>;
  now(): Date;
}

export interface SendResult { status: number; body: Record<string, unknown> }

export async function handleOutreachSend(input: unknown, deps: SendDeps): Promise<SendResult> {
  const fail = (status: number, message: string, extra: Record<string, unknown> = {}) =>
    ({ status, body: { success: false, message, ...extra } });

  const caller = await deps.callerRole();
  if (!caller) return fail(401, 'Invalid token');
  if (caller.role !== 'SUPER_ADMIN') return fail(403, 'Only SUPER_ADMIN can send outreach email');

  const cfgErr = configProblem(deps.config);
  if (cfgErr) return fail(503, cfgErr);

  const r = (input ?? {}) as Partial<SendRequest>;
  const subject = (r.subject ?? '').trim();
  const body = (r.body ?? '').trim();
  const key = (r.idempotencyKey ?? '').trim();
  if (!r.prospectId || !subject || !body) return fail(400, 'prospectId, subject and body are required');
  if (!/^[A-Za-z0-9-]{16,64}$/.test(key)) return fail(400, 'A valid idempotencyKey is required');
  if (subject.length > 200 || body.length > 10000) return fail(400, 'Subject or body is too long');
  if (/[\r\n]/.test(subject)) return fail(400, 'Subject must be a single line');
  if (hasUnresolvedVariables(subject) || hasUnresolvedVariables(body)) {
    return fail(400, 'Message still contains unfilled {{variables}}');
  }

  // Recipient comes from the database, never from the request: no relay.
  const p = await deps.getProspect(r.prospectId);
  if (!p) return fail(404, 'Prospect not found');
  if ((r.confirmEmail ?? '').trim().toLowerCase() !== p.email) {
    return fail(400, 'Recipient confirmation does not match the prospect address');
  }
  const blocked = sendBlockReason(p, await deps.isSuppressed(p.email));
  if (blocked) return fail(422, blocked);

  const now = deps.now();
  if (await deps.hasPendingSince(p.id, new Date(now.getTime() - 86400_000).toISOString())) {
    return fail(409, 'An earlier send to this prospect has an unknown outcome. Check the Resend dashboard before sending again (blocked for 24 hours).');
  }
  const hour = await deps.countOutboundSince(new Date(now.getTime() - 3600_000).toISOString());
  const day = await deps.countOutboundSince(new Date(now.getTime() - 86400_000).toISOString());
  if (hour >= OUTREACH_MAX_PER_HOUR || day >= OUTREACH_MAX_PER_DAY) {
    return fail(429, `Rate limit: at most ${OUTREACH_MAX_PER_HOUR} per hour and ${OUTREACH_MAX_PER_DAY} per day`);
  }

  const claimed = await deps.claim({
    prospect_id: p.id, direction: 'OUTBOUND', template_key: r.templateKey ?? null,
    subject, body, status: 'SENDING', recipient_email: p.email,
    idempotency_key: key, created_by: caller.id,
  });
  if (!claimed) return fail(409, 'This message was already submitted', { duplicate: true });

  const unsub = await deps.unsubscribeUrl(p.email);
  const { html, text } = renderOutreachEmail({ body, unsubscribeUrl: unsub, postalAddress: deps.config.postalAddress! });
  const payload: Record<string, unknown> = {
    from: deps.config.fromEmail, to: [p.email], subject, html, text,
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    tags: [{ name: 'category', value: 'outreach' }],
  };
  if (deps.config.replyTo) payload.reply_to = deps.config.replyTo.trim();

  let res: { id?: string; error?: string; unknown?: boolean };
  try {
    res = await deps.resend(payload, key);
  } catch (e) {
    res = { error: e instanceof Error ? e.message : String(e), unknown: true };
  }

  // A timeout is not a failure: the email may be on its way. Leave the row
  // SENDING so it counts against the rate limit and blocks an immediate resend.
  if (!res.id && res.unknown) {
    await deps.finish(claimed.id, { error: `Outcome unknown: ${res.error ?? 'no response'}` });
    return fail(504, 'Resend did not answer in time. The email may still be delivered — check the Resend dashboard before sending again.', { messageId: claimed.id, unknown: true });
  }

  if (!res.id) {
    await deps.finish(claimed.id, { status: 'FAILED', error: res.error ?? 'Resend did not accept the message' });
    return fail(502, `Send failed: ${res.error ?? 'Resend did not accept the message'}`, { messageId: claimed.id });
  }

  const sentAt = deps.now().toISOString();
  await deps.finish(claimed.id, { status: 'SENT', provider_message_id: res.id, sent_at: sentAt, error: null });
  await deps.markContacted(p.id, sentAt);
  return { status: 200, body: { success: true, message: 'Sent', messageId: claimed.id, providerMessageId: res.id } };
}
