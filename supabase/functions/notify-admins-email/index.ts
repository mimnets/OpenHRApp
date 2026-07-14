// OpenHR — Notify Admins Email Edge Function
// Sends email notifications to SUPER_ADMINS or ORG_ADMINS.
// Called from client-side upgrade.service.ts (which cannot access RESEND_API_KEY).
// Deno runtime (Supabase Edge Functions)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FROM_EMAIL = 'OpenHR <noreply@openhrapp.com>';

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

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    return new Response(JSON.stringify({ message: 'Email not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ message: 'Missing Authorization header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
  const serviceRole  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient  = createClient(supabaseUrl, serviceRole);

  // Verify the caller's JWT
  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !caller) {
    return new Response(JSON.stringify({ message: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const target  = body.target as string;   // 'SUPER_ADMINS' | 'ORG_ADMINS'
    const orgId   = body.orgId as string | undefined;
    const subject = body.subject as string;
    const html    = body.html as string;

    if (!target || !subject || !html) {
      return new Response(JSON.stringify({ message: 'Missing required fields: target, subject, html' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (target === 'ORG_ADMINS' && !orgId) {
      return new Response(JSON.stringify({ message: 'orgId required for ORG_ADMINS target' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Resolve target profiles ──────────────────────────────────────────
    let profiles: Array<{ id: string }> = [];

    if (target === 'SUPER_ADMINS') {
      const { data } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'SUPER_ADMIN');
      profiles = data ?? [];
    } else if (target === 'ORG_ADMINS') {
      const { data } = await adminClient
        .from('profiles')
        .select('id')
        .eq('organization_id', orgId)
        .in('role', ['ADMIN', 'HR']);
      profiles = data ?? [];
    } else {
      return new Response(JSON.stringify({ message: `Invalid target: ${target}. Use SUPER_ADMINS or ORG_ADMINS` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No recipients found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Map profile IDs to auth.user emails ──────────────────────────────
    const profileIds = profiles.map(p => p.id);
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 10000 });
    const emailMap = new Map<string, string>();
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        if (u.email && profileIds.includes(u.id)) {
          emailMap.set(u.id, u.email);
        }
      }
    }

    // ── Send emails ──────────────────────────────────────────────────────
    let sent = 0;
    let failed = 0;

    for (const [userId, toEmail] of emailMap) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [toEmail],
            subject,
            html,
          }),
        });
        if (res.ok) {
          sent++;
        } else {
          failed++;
          console.error(`[NotifyAdminsEmail] Failed for ${userId}: ${res.status} ${await res.text()}`);
        }
      } catch (e) {
        failed++;
        console.error(`[NotifyAdminsEmail] Error for ${userId}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, message: `Sent ${sent}, failed ${failed}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[NotifyAdminsEmail] Unhandled error:', err);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
