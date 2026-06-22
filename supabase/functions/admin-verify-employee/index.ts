// OpenHR — Admin Verify Employee Edge Function
// Requires ADMIN / HR / SUPER_ADMIN caller. Manually activates an employee account:
// confirms the email in auth (so they can log in) and flips profiles.verified.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed');
  }

  try {
    // Verify caller JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError(401, 'Missing Authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !caller) return jsonError(401, 'Invalid token');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch caller's profile to verify role + org
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', caller.id)
      .single();

    if (profileErr || !callerProfile) return jsonError(403, 'Caller profile not found');
    if (!['ADMIN', 'HR', 'SUPER_ADMIN'].includes(callerProfile.role)) {
      return jsonError(403, 'Only ADMIN or HR can verify employees');
    }

    const body = await req.json().catch(() => ({}));
    const userId = body?.userId?.toString()?.trim() ?? '';
    if (!userId) return jsonError(400, 'Missing required field: userId');

    // Resolve target profile and enforce same-org (super admins bypass).
    const { data: targetProfile, error: targetErr } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (targetErr || !targetProfile) return jsonError(404, 'Employee not found');
    if (callerProfile.role !== 'SUPER_ADMIN' &&
        targetProfile.organization_id !== callerProfile.organization_id) {
      return jsonError(403, 'Cannot verify an employee from another organization');
    }

    // Confirm the email in auth via direct GoTrue Admin REST call.
    // We avoid supabase-js auth.admin.updateUserById here because esm.sh
    // resolution of @supabase/supabase-js@2 is unpinned and some resolved
    // versions ship a GoTrueAdminApi that doesn't expose this method.
    const confirmRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${userId}`,
      {
        method: 'PUT',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_confirm: true }),
      },
    );
    if (!confirmRes.ok) {
      const errBody = await confirmRes.text().catch(() => '');
      return jsonError(400, `Failed to confirm email: ${confirmRes.status} ${errBody}`);
    }

    // Flip the profile flag so the user drops off the unverified list.
    const { error: flagErr } = await adminClient
      .from('profiles')
      .update({ verified: true })
      .eq('id', userId);
    if (flagErr) return jsonError(400, 'Failed to update profile: ' + flagErr.message);

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ADMIN-VERIFY-EMPLOYEE]', msg);
    return jsonError(500, msg);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
