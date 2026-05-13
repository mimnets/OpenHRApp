// OpenHR — Super Admin Delete Organization Edge Function
// Deletes org cascade: profiles + auth.users + all child rows via ON DELETE CASCADE.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError(401, 'Missing Authorization header');

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user: caller } } = await anonClient.auth.getUser();
  if (!caller) return jsonError(401, 'Invalid token');

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', caller.id).single();
  if (callerProfile?.role !== 'SUPER_ADMIN') return jsonError(403, 'Only SUPER_ADMIN can delete organizations');

  try {
    const { organizationId } = await req.json();
    if (!organizationId) return jsonError(400, 'organizationId required');

    // Collect profile (auth user) IDs before cascade delete wipes them
    const { data: profileRows } = await adminClient
      .from('profiles')
      .select('id')
      .eq('organization_id', organizationId);
    const authUserIds = (profileRows ?? []).map((p: any) => p.id);

    // Delete org — ON DELETE CASCADE handles all child rows (profiles, attendance, leaves, etc.)
    const { error: orgErr } = await adminClient
      .from('organizations')
      .delete()
      .eq('id', organizationId);
    if (orgErr) return jsonError(500, 'Failed to delete organization: ' + orgErr.message);

    // Delete auth users (can't be done client-side)
    let authDeleted = 0;
    let authFailed = 0;
    for (const uid of authUserIds) {
      const { error } = await adminClient.auth.admin.deleteUser(uid);
      if (error) { authFailed++; console.warn('[DELETE-ORG] auth user delete failed:', uid, error.message); }
      else authDeleted++;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Organization deleted successfully',
      authDeleted,
      authFailed,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return jsonError(500, 'Internal Server Error: ' + (err as Error).message);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
