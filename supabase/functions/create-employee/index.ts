// OpenHR — Create Employee Edge Function
// Requires ADMIN or HR caller. Uses service role to create auth.users + profile.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed');
  }

  // Verify caller JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError(401, 'Missing Authorization header');

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !caller) return jsonError(401, 'Invalid token');

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch caller's profile to verify role + org
  const { data: callerProfile, error: profileErr } = await adminClient
    .from('profiles')
    .select('role, organization_id')
    .eq('id', caller.id)
    .single();

  if (profileErr || !callerProfile) return jsonError(403, 'Caller profile not found');
  if (!['ADMIN', 'HR', 'SUPER_ADMIN'].includes(callerProfile.role)) {
    return jsonError(403, 'Only ADMIN or HR can create employees');
  }

  try {
    const formData = await req.formData();
    const email       = formData.get('email')?.toString()?.trim().toLowerCase() ?? '';
    const password    = formData.get('password')?.toString() ?? '';
    const name        = formData.get('name')?.toString()?.trim() ?? '';
    const role        = (formData.get('role')?.toString() ?? 'EMPLOYEE').toUpperCase();
    const department  = formData.get('department')?.toString()?.trim() ?? '';
    const designation = formData.get('designation')?.toString()?.trim() ?? '';
    const employeeId  = formData.get('employeeId')?.toString()?.trim() ?? '';
    const lineManagerId = formData.get('lineManagerId')?.toString()?.trim() || null;
    const teamId      = formData.get('teamId')?.toString()?.trim() || null;
    const shiftId     = formData.get('shiftId')?.toString()?.trim() || null;
    const mobile      = formData.get('mobile')?.toString()?.trim() ?? '';
    const joiningDate = formData.get('joiningDate')?.toString()?.trim() || null;
    const avatarFile  = formData.get('avatar') instanceof File ? formData.get('avatar') as File : null;

    if (!email || !password || !name) {
      return jsonError(400, 'Missing required fields: email, password, name');
    }
    if (password.length < 8) {
      return jsonError(400, 'Password must be at least 8 characters');
    }

    const orgId = callerProfile.organization_id;

    // Create auth user
    const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name },
    });

    if (createErr || !authData.user) {
      return jsonError(400, 'Failed to create user: ' + createErr?.message);
    }

    // admin.createUser does NOT auto-send verification email — trigger it explicitly
    await adminClient.auth.resend({ type: 'signup', email });


    const userId = authData.user.id;

    // Upload avatar if provided
    let avatarPath: string | null = null;
    if (avatarFile && avatarFile.size > 0) {
      try {
        const path = `${userId}/avatar.webp`;
        const { error: uploadErr } = await adminClient.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: 'image/webp' });
        if (!uploadErr) avatarPath = path;
      } catch (e) {
        console.warn('[CREATE-EMPLOYEE] Avatar upload failed (non-fatal):', e);
      }
    }

    // Create profile.
    // NOTE: the `on_auth_user_created` trigger (handle_new_user) already inserts a
    // minimal profile row when the auth user is created above, so a plain insert
    // here collides on profiles_pkey. Upsert on `id` to fill in the full details.
    const { error: profileInsertErr } = await adminClient.from('profiles').upsert({
      id:              userId,
      organization_id: orgId,
      name,
      role,
      employee_id:     employeeId || null,
      department:      department || null,
      designation:     designation || null,
      line_manager_id: lineManagerId,
      team_id:         teamId,
      shift_id:        shiftId,
      mobile:          mobile || null,
      joining_date:    joiningDate,
      avatar:          avatarPath,
      verified:        false,
    }, { onConflict: 'id' });

    if (profileInsertErr) {
      // Rollback auth user
      await adminClient.auth.admin.deleteUser(userId);
      return jsonError(400, 'Failed to create profile: ' + profileInsertErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[CREATE-EMPLOYEE] Unhandled error:', err);
    return jsonError(500, 'Internal Server Error: ' + (err as Error).message);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
