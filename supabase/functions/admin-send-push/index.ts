// OpenHR — Super Admin Push Broadcast
// Endpoint: POST /functions/v1/admin-send-push
//
// Body: { title, body, url?, icon?, targetType: 'ALL'|'ORG'|'ROLE'|'USER',
//         targetValue?: string, previewOnly?: boolean }
//
// Auth: Bearer <user JWT>. User must have role SUPER_ADMIN in profiles.
// Returns: { recipientCount, deliveredCount, failedCount, staleCleaned, broadcastId }
// previewOnly=true → recipient count only, no send, no broadcasts row.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushSubscription {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface RequestBody {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  targetType?: 'ALL' | 'ORG' | 'ROLE' | 'USER';
  targetValue?: string;
  previewOnly?: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function sendWebPush(
  sub: PushSubscription,
  payload: { title: string; body: string; url?: string; icon?: string; tag?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<{ ok: boolean; status: number }> {
  const audience = new URL(sub.endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claims = btoa(JSON.stringify({ aud: audience, exp: expiry, sub: vapidSubject }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signingInput = `${header}.${claims}`;

  // Decode public key (65 bytes: 0x04 || X(32) || Y(32))
  const pubBytes = Uint8Array.from(
    atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
  const xBytes = pubBytes.slice(1, 33);
  const yBytes = pubBytes.slice(33, 65);
  const toB64Url = (b: Uint8Array) =>
    btoa(String.fromCharCode(...b))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: toB64Url(xBytes),
    y: toB64Url(yBytes),
    d: vapidPrivateKey.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'),
    ext: true,
  };
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signingInput}.${sig}`;
  // Note: sending without payload (no encryption). Browser shows generic SW push event with empty data.
  // Service worker push handler must handle empty data case.
  void payload;

  try {
    const response = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
        'TTL': '86400',
      },
    });
    const text = await response.text();
    console.log(`[push-send] status=${response.status} endpoint=${sub.endpoint.slice(0, 60)} body=${text.slice(0, 200)}`);
    return { ok: response.ok || response.status === 201, status: response.status };
  } catch (e) {
    console.error(`[push-send] throw`, e);
    return { ok: false, status: 0 };
  }
}

Deno.serve(async (req: Request) => {
  try {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse(401, { success: false, message: 'Missing bearer token' });
  }
  const userJwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify JWT + load role from profiles
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return jsonResponse(401, { success: false, message: 'Invalid token' });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'SUPER_ADMIN') {
    return jsonResponse(403, { success: false, message: 'SUPER_ADMIN role required' });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { success: false, message: 'Invalid JSON' });
  }

  const {
    title, body: msgBody, url, icon, targetType,
    targetValue, previewOnly = false,
  } = body;

  if (!targetType || !['ALL', 'ORG', 'ROLE', 'USER'].includes(targetType)) {
    return jsonResponse(400, { success: false, message: 'Invalid targetType' });
  }
  if (!previewOnly) {
    if (!title || !msgBody) {
      return jsonResponse(400, { success: false, message: 'title and body required' });
    }
    if (title.length > 100) {
      return jsonResponse(400, { success: false, message: 'title max 100 chars' });
    }
    if (msgBody.length > 300) {
      return jsonResponse(400, { success: false, message: 'body max 300 chars' });
    }
  }
  if ((targetType === 'ORG' || targetType === 'USER') && !targetValue) {
    return jsonResponse(400, { success: false, message: 'targetValue required for ORG/USER' });
  }
  if (targetType === 'ROLE' && !targetValue) {
    return jsonResponse(400, { success: false, message: 'targetValue (role) required' });
  }

  // Build subscription query based on target
  let subs: PushSubscription[] = [];
  if (targetType === 'ALL') {
    const { data } = await admin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth');
    subs = (data ?? []) as PushSubscription[];
  } else if (targetType === 'ORG') {
    const { data } = await admin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('organization_id', targetValue!);
    subs = (data ?? []) as PushSubscription[];
  } else if (targetType === 'USER') {
    const { data } = await admin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('user_id', targetValue!);
    subs = (data ?? []) as PushSubscription[];
  } else if (targetType === 'ROLE') {
    // join via profiles role
    const { data: roleProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('role', targetValue!);
    const userIds = (roleProfiles ?? []).map((r: { id: string }) => r.id);
    if (userIds.length === 0) {
      subs = [];
    } else {
      const { data } = await admin
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .in('user_id', userIds);
      subs = (data ?? []) as PushSubscription[];
    }
  }

  const recipientCount = subs.length;

  if (previewOnly) {
    return jsonResponse(200, { success: true, recipientCount });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return jsonResponse(500, { success: false, message: 'VAPID keys not configured' });
  }

  const payload = {
    title: title!,
    body: msgBody!,
    url: url || '/dashboard',
    icon: icon || '/img/icon-192.png',
    tag: `broadcast-${Date.now()}`,
  };

  let deliveredCount = 0;
  let failedCount = 0;
  let staleCleaned = 0;

  for (const sub of subs) {
    const result = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
    if (result.ok) {
      deliveredCount++;
    } else {
      failedCount++;
      // Only delete subscription if push service says it's gone (404/410)
      if (result.status === 404 || result.status === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        staleCleaned++;
      }
    }
  }

  const { data: broadcastRow } = await admin
    .from('broadcasts')
    .insert({
      sent_by: user.id,
      sent_by_name: profile.name ?? null,
      title: title!,
      body: msgBody!,
      url: url ?? null,
      icon: icon ?? null,
      target_type: targetType,
      target_value: targetValue ?? null,
      recipient_count: recipientCount,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      stale_cleaned: staleCleaned,
    })
    .select('id')
    .single();

  // Also log to notifications table for in-app bell (best effort, only for ALL/ORG with org)
  // Skip — would need per-user-org fan-out; broadcasts table is the audit source.

  console.log(
    `[admin-send-push] sent_by=${user.id} target=${targetType}:${targetValue ?? '-'} ` +
    `recipients=${recipientCount} delivered=${deliveredCount} failed=${failedCount}`,
  );

  return jsonResponse(200, {
    success: true,
    broadcastId: broadcastRow?.id,
    recipientCount,
    deliveredCount,
    failedCount,
    staleCleaned,
  });
  } catch (err) {
    console.error('[admin-send-push] unhandled', err);
    return jsonResponse(500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
