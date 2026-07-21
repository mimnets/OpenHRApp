// OpenHR — Demo Credentials Edge Function
// Returns demo account details (emails, names, roles) and the shared password
// for display in the DemoLoginModal on the landing page.
//
// Deno runtime (Supabase Edge Functions)

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

// ── Demo account definitions (mirrors demo-reset/index.ts) ────────────────────

interface DemoAccount {
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  employeeId: string;
  department: string;
  designation: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'demo-admin@openhrapp.com',
    name: 'Alex Morgan',
    role: 'ADMIN',
    employeeId: 'DEMO-001',
    department: 'Management',
    designation: 'HR Director',
  },
  {
    email: 'demo-manager@openhrapp.com',
    name: 'Jordan Chen',
    role: 'MANAGER',
    employeeId: 'DEMO-002',
    department: 'Engineering',
    designation: 'Engineering Manager',
  },
  {
    email: 'demo-employee@openhrapp.com',
    name: 'Taylor Reed',
    role: 'EMPLOYEE',
    employeeId: 'DEMO-003',
    department: 'Marketing',
    designation: 'Marketing Specialist',
  },
];

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const demoPassword = Deno.env.get('DEMO_USER_PASSWORD');

  if (!demoPassword) {
    console.error('[demo-credentials] DEMO_USER_PASSWORD env var is not configured');
    return jsonResponse(500, { error: 'Demo not configured' });
  }

  console.log(
    `[demo-credentials] Credentials requested | ip=${req.headers.get('x-forwarded-for') || 'unknown'}`
  );

  return jsonResponse(200, {
    password: demoPassword,
    accounts: DEMO_ACCOUNTS,
  });
});
