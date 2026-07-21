// OpenHR — Demo Login Edge Function
// Returns session tokens for the demo organization admin user.
// Called by the "Try Live Demo" button on the landing page.
//
// Deno runtime (Supabase Edge Functions)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const demoPassword = Deno.env.get('DEMO_USER_PASSWORD');

  if (!demoPassword) {
    console.error('[demo-login] DEMO_USER_PASSWORD env var is not configured');
    return jsonResponse(500, { error: 'Demo not configured' });
  }

  // Service-role client for admin operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ── Step 1: Find the demo organization ────────────────────────────────────
    const { data: demoOrg } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('is_demo', true)
      .maybeSingle();

    if (!demoOrg) {
      return jsonResponse(404, { error: 'Demo organization not found. Please try again later.' });
    }

    const orgId = demoOrg.id;

    // ── Step 2: Find the demo admin user ──────────────────────────────────────
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('id, email, name')
      .eq('organization_id', orgId)
      .eq('role', 'ADMIN')
      .limit(1)
      .maybeSingle();

    let adminEmail = adminProfile?.email || 'demo-admin@openhrapp.com';

    // If admin doesn't exist, create on the fly
    if (!adminProfile) {
      console.log('[demo-login] Demo admin not found — creating on the fly');
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { name: 'Alex Morgan' },
      });

      if (authErr) {
        console.error('[demo-login] Failed to create demo admin:', authErr.message);
        return jsonResponse(500, { error: 'Failed to create demo user' });
      }

      const { error: profileErr } = await adminClient.from('profiles').upsert({
        id: authData.user.id,
        organization_id: orgId,
        name: 'Alex Morgan',
        email: adminEmail,
        role: 'ADMIN',
        employee_id: 'DEMO-001',
        department: 'Management',
        designation: 'HR Director',
        verified: true,
      });

      if (profileErr) {
        console.error('[demo-login] Profile creation failed:', profileErr.message);
      }
    }

    // ── Step 3: Sign in as the demo admin to get session tokens ──────────────
    const anonClient = createClient(supabaseUrl, anonKey);

    const { data: sessionData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: adminEmail,
      password: demoPassword,
    });

    if (signInErr || !sessionData.session) {
      console.error('[demo-login] Sign-in failed:', signInErr?.message);

      // Fallback: try re-creating the user (password may have been reset)
      try {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          u => u.email?.toLowerCase() === adminEmail.toLowerCase()
        );

        if (existingUser) {
          // Update password
          await adminClient.auth.admin.updateUserById(existingUser.id, {
            password: demoPassword,
            email_confirm: true,
          });
          console.log('[demo-login] Reset password for existing demo admin');
        }
      } catch (resetErr) {
        console.error('[demo-login] Password reset failed:', resetErr);
      }

      return jsonResponse(500, { error: 'Unable to sign in to demo account' });
    }

    const { access_token, refresh_token, expires_in } = sessionData.session;

    // ── Step 4: Log the access attempt ────────────────────────────────────────
    const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();

    console.log(
      `[demo-login] ACCESS | time=${timestamp} | ip=${forwardedFor} | ua=${userAgent.substring(0, 100)}`
    );

    return jsonResponse(200, {
      access_token,
      refresh_token,
      expires_in: expires_in || 3600,
    });
  } catch (err) {
    console.error('[demo-login] Unhandled error:', err);
    return jsonResponse(500, { error: 'Internal Server Error: ' + (err as Error).message });
  }
});
