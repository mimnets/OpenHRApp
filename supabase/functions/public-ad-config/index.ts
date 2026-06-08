// OpenHR — Public Ad Config Edge Function
// Returns ad configuration for a given slot. Public (no auth required).
// Reads from the settings table where key = ad_config_<slot>, scoped to the
// organization that owns the ad configuration.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return jsonError(405, 'Method not allowed');
  }

  try {
    const url = new URL(req.url);
    const slot = url.pathname.split('/').pop()?.trim() ?? '';

    if (!slot) {
      return jsonError(400, 'Missing ad slot');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find the first org that has an ad_config for this slot
    const { data: settings, error } = await adminClient
      .from('settings')
      .select('value, organization_id')
      .eq('key', `ad_config_${slot}`)
      .limit(1);

    if (error || !settings?.length) {
      return jsonError(404, 'Ad config not found');
    }

    const value = typeof settings[0].value === 'string'
      ? JSON.parse(settings[0].value)
      : settings[0].value;

    return new Response(JSON.stringify(value), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PUBLIC-AD-CONFIG]', msg);
    return jsonError(500, msg);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
