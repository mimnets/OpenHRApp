// OpenHR — Demo Login Edge Function
// Returns session tokens for a demo organization user.
// Called by the "Try Live Demo" button on the landing page.
//
// Accepts optional JSON body: { role: "admin" | "manager" | "employee" }
// Defaults to "admin" if no body or role is provided.
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

// ── Demo account definitions (mirrors demo-reset and demo-credentials) ────────

interface DemoAccount {
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  employeeId: string;
  department: string;
  designation: string;
}

const ROLE_ACCOUNTS: Record<string, DemoAccount> = {
  admin: {
    email: 'demo-admin@openhrapp.com',
    name: 'Alex Morgan',
    role: 'ADMIN',
    employeeId: 'DEMO-001',
    department: 'Management',
    designation: 'HR Director',
  },
  manager: {
    email: 'demo-manager@openhrapp.com',
    name: 'Jordan Chen',
    role: 'MANAGER',
    employeeId: 'DEMO-002',
    department: 'Engineering',
    designation: 'Engineering Manager',
  },
  employee: {
    email: 'demo-employee@openhrapp.com',
    name: 'Taylor Reed',
    role: 'EMPLOYEE',
    employeeId: 'DEMO-003',
    department: 'Marketing',
    designation: 'Marketing Specialist',
  },
};

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
    // ── Step 1: Parse requested role from body (default: admin) ────────────────
    let requestedRole = 'admin';
    try {
      const body = await req.json();
      if (body.role && ROLE_ACCOUNTS[body.role]) {
        requestedRole = body.role;
      }
    } catch {
      // No body or invalid JSON — use default 'admin'
    }

    const account = ROLE_ACCOUNTS[requestedRole];
    console.log(`[demo-login] Requested role: ${requestedRole} → ${account.email}`);

    // ── Step 2: Find the demo organization ────────────────────────────────────
    const { data: demoOrg } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('is_demo', true)
      .maybeSingle();

    if (!demoOrg) {
      return jsonResponse(404, { error: 'Demo organization not found. Please try again later.' });
    }

    const orgId = demoOrg.id;

    // ── Step 3: Find or create the demo user ──────────────────────────────────
    const targetEmail = account.email;

    // First check if the profile already exists in this org
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, email, name')
      .eq('organization_id', orgId)
      .eq('email', targetEmail)
      .limit(1)
      .maybeSingle();

    let userId = existingProfile?.id;

    if (!existingProfile) {
      console.log(`[demo-login] Profile not found for ${targetEmail} — ensuring auth user exists`);

      // Check if the auth user already exists (e.g. from a prior demo-reset)
      let existingAuthUser: { id: string } | null = null;
      try {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const match = existingUsers?.users?.find(
          u => u.email?.toLowerCase() === targetEmail.toLowerCase()
        );
        if (match) existingAuthUser = { id: match.id };
      } catch {
        // listUsers may fail; ignore and try createUser
      }

      if (existingAuthUser) {
        // User exists in Auth — reset their password and create/update the profile
        console.log(`[demo-login] Auth user exists for ${targetEmail} — resetting password`);
        userId = existingAuthUser.id;
        await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
          password: demoPassword,
          email_confirm: true,
        });
      } else {
        // No existing user — create one
        console.log(`[demo-login] Creating new auth user: ${targetEmail}`);
        const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
          email: targetEmail,
          password: demoPassword,
          email_confirm: true,
          user_metadata: { name: account.name },
        });

        if (authErr) {
          console.error('[demo-login] Failed to create user:', authErr.message);
          return jsonResponse(500, { error: 'Failed to create demo user: ' + authErr.message });
        }
        userId = authData.user.id;
      }

      // Create or update the profile for the demo org
      const { error: profileErr } = await adminClient.from('profiles').upsert({
        id: userId,
        organization_id: orgId,
        name: account.name,
        email: targetEmail,
        role: account.role,
        employee_id: account.employeeId,
        department: account.department,
        designation: account.designation,
        verified: true,
      });

      if (profileErr) {
        console.error('[demo-login] Profile upsert failed:', profileErr.message);
      }
    }

    // ── Step 4: Sign in as the demo user to get session tokens ────────────────
    const anonClient = createClient(supabaseUrl, anonKey);

    const { data: sessionData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: targetEmail,
      password: demoPassword,
    });

    if (signInErr || !sessionData.session) {
      console.error('[demo-login] Sign-in failed:', signInErr?.message);
      return jsonResponse(500, { error: 'Sign-in failed: ' + (signInErr?.message || 'unknown') });
    }

    const { access_token, refresh_token, expires_in } = sessionData.session;

    // ── Step 5: Log the access attempt ────────────────────────────────────────
    const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();

    console.log(
      `[demo-login] ACCESS | time=${timestamp} | role=${requestedRole} | email=${targetEmail} | ip=${forwardedFor} | ua=${userAgent.substring(0, 100)}`
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
