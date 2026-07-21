// OpenHR — Demo Reset Cron Edge Function
// Runs daily at midnight UTC via pg_cron → net.http_post()
// Wipes and re-seeds the demo organization with fresh sample data.
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

function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

// ── Demo user definitions ────────────────────────────────────────────────────

const DEMO_USERS = [
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

  // ── Auth: CRON_SECRET required ─────────────────────────────────────────────
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.error('[demo-reset] CRON_SECRET env var is not configured');
    return jsonResponse(500, { error: 'Server configuration error' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const demoPassword = Deno.env.get('DEMO_USER_PASSWORD');
  if (!demoPassword) {
    console.error('[demo-reset] DEMO_USER_PASSWORD env var is not configured');
    return jsonResponse(500, { error: 'DEMO_USER_PASSWORD not configured' });
  }

  try {
    // ── Step 1: Find or create the demo organization ─────────────────────────
    let { data: demoOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('is_demo', true)
      .maybeSingle();

    if (!demoOrg) {
      console.log('[demo-reset] Demo org not found — creating...');
      const { data: newOrg, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: 'Demo Corp',
          country: 'US',
          subscription_status: 'ACTIVE',
          is_demo: true,
        })
        .select('id')
        .single();

      if (orgErr || !newOrg) {
        throw new Error(`Failed to create demo org: ${orgErr?.message}`);
      }
      demoOrg = newOrg;
      console.log(`[demo-reset] Created demo org: ${demoOrg.id}`);
    }

    const orgId = demoOrg.id;
    console.log(`[demo-reset] Demo org ID: ${orgId}`);

    // ── Step 2: Ensure demo users exist ──────────────────────────────────────
    for (const def of DEMO_USERS) {
      // Check profiles first (cheaper than listUsers)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', def.email)
        .maybeSingle();

      if (existingProfile) {
        // Update org_id and role in case they drifted
        await supabase
          .from('profiles')
          .update({
            organization_id: orgId,
            role: def.role,
            name: def.name,
            employee_id: def.employeeId,
            department: def.department,
            designation: def.designation,
          })
          .eq('id', existingProfile.id);
        console.log(`[demo-reset] Updated existing user: ${def.email}`);
        continue;
      }

      // Create new auth user
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: def.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { name: def.name },
      });

      if (authErr) {
        console.error(`[demo-reset] Failed to create auth user ${def.email}: ${authErr.message}`);
        continue;
      }

      const userId = authData.user.id;

      // Create profile
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        organization_id: orgId,
        name: def.name,
        email: def.email,
        role: def.role,
        employee_id: def.employeeId,
        department: def.department,
        designation: def.designation,
        verified: true,
      });

      if (profileErr) {
        console.error(`[demo-reset] Profile creation failed for ${def.email}: ${profileErr.message}`);
      } else {
        console.log(`[demo-reset] Created demo user: ${def.email} (${userId})`);
      }
    }

    // ── Step 3: Wipe existing demo data (FK-safe order) ──────────────────────
    const tables = [
      'performance_reviews',
      'review_cycles',
      'notifications',
      'announcements',
      'leaves',
      'attendance',
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', orgId);
      if (error) {
        console.error(`[demo-reset] Failed to wipe ${table}: ${error.message}`);
      } else {
        console.log(`[demo-reset] Wiped ${table}`);
      }
    }

    // ── Step 4: Get demo user IDs for data seeding ───────────────────────────
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, employee_id')
      .eq('organization_id', orgId);

    if (!profiles || profiles.length === 0) {
      throw new Error('Demo profiles not found after creation step');
    }

    const adminProfile = profiles.find(p => p.role === 'ADMIN') || profiles[0];
    const otherProfiles = profiles.filter(p => p.id !== adminProfile.id);

    // ── Step 5: Re-seed attendance (last 30 days) ────────────────────────────
    const attendanceRows: Record<string, unknown>[] = [];
    const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT']; // ~80% present, 10% late, 10% absent

    for (const profile of profiles) {
      for (let days = 30; days >= 0; days--) {
        const date = daysAgo(days);
        const dayOfWeek = new Date(date).getUTCDay();
        // Skip weekends (Saturday=6, Sunday=0)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const checkInHour = status === 'LATE' ? 9 + Math.floor(Math.random() * 2) : 8 + Math.floor(Math.random() * 1);
        const checkInMinute = Math.floor(Math.random() * 30);
        const checkInTime = `${String(checkInHour).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}:00`;

        let checkOutTime: string | null = null;
        if (status !== 'ABSENT') {
          const checkOutHour = 17 + Math.floor(Math.random() * 2);
          const checkOutMinute = Math.floor(Math.random() * 60);
          checkOutTime = `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}:00`;
        }

        attendanceRows.push({
          organization_id: orgId,
          employee_id: profile.employee_id,
          date: date.split('T')[0],
          check_in: status === 'ABSENT' ? null : `${checkInTime}`,
          check_out: checkOutTime,
          status,
          note: status === 'LATE' ? 'Traffic delay' : status === 'ABSENT' ? 'Sick day' : null,
          created: date,
          updated: date,
        });
      }
    }

    if (attendanceRows.length > 0) {
      const { error: attErr } = await supabase.from('attendance').insert(attendanceRows);
      if (attErr) {
        console.error(`[demo-reset] Attendance seed failed: ${attErr.message}`);
      } else {
        console.log(`[demo-reset] Inserted ${attendanceRows.length} attendance records`);
      }
    }

    // ── Step 6: Re-seed leave requests ───────────────────────────────────────
    const leaveRows: Record<string, unknown>[] = [];
    const leaveTypes = ['ANNUAL', 'CASUAL', 'SICK'];
    const leaveStatuses = ['APPROVED', 'APPROVED', 'APPROVED', 'PENDING', 'REJECTED'];

    for (const profile of profiles) {
      const numLeaves = 3 + Math.floor(Math.random() * 4); // 3-6 leaves per user
      for (let i = 0; i < numLeaves; i++) {
        const startDay = 5 + Math.floor(Math.random() * 25); // 5-30 days ago
        const duration = 1 + Math.floor(Math.random() * 3); // 1-3 days
        const startDate = daysAgo(startDay).split('T')[0];
        const endDate = daysAgo(startDay - duration + 1).split('T')[0];
        const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
        const leaveStatus = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];

        leaveRows.push({
          organization_id: orgId,
          employee_id: profile.employee_id,
          type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason: `${leaveType} leave — ${['Personal errand', 'Family event', 'Medical appointment', 'Vacation', 'Rest day'][Math.floor(Math.random() * 5)]}`,
          status: leaveStatus,
          approved_by: leaveStatus === 'APPROVED' ? adminProfile.employee_id : null,
          created: daysAgo(startDay),
          updated: daysAgo(startDay),
        });
      }
    }

    if (leaveRows.length > 0) {
      const { error: leaveErr } = await supabase.from('leaves').insert(leaveRows);
      if (leaveErr) {
        console.error(`[demo-reset] Leave seed failed: ${leaveErr.message}`);
      } else {
        console.log(`[demo-reset] Inserted ${leaveRows.length} leave requests`);
      }
    }

    // ── Step 7: Re-seed announcements ────────────────────────────────────────
    const announcementRows = [
      {
        organization_id: orgId,
        author_id: adminProfile.id,
        title: 'Welcome to Demo Corp! 👋',
        content: 'Welcome to the OpenHRApp live demo! Explore the dashboard, check out attendance records, leave management, and employee directory. Everything you see here resets daily at midnight UTC — so feel free to experiment!',
        priority: 'NORMAL',
        created: daysAgo(2),
        updated: daysAgo(2),
      },
      {
        organization_id: orgId,
        author_id: adminProfile.id,
        title: 'Office closed for upcoming holiday',
        content: 'Please note that the office will be closed on July 4th for Independence Day. Regular operations resume on July 5th. Plan your leave accordingly.',
        priority: 'HIGH',
        created: daysAgo(7),
        updated: daysAgo(7),
      },
    ];

    const { error: annErr } = await supabase.from('announcements').insert(announcementRows);
    if (annErr) {
      console.error(`[demo-reset] Announcements seed failed: ${annErr.message}`);
    } else {
      console.log(`[demo-reset] Inserted ${announcementRows.length} announcements`);
    }

    // ── Step 8: Ensure settings rows exist ────────────────────────────────────
    const settingsRows = [
      {
        organization_id: orgId,
        key: 'app_config',
        value: JSON.stringify({
          companyName: 'Demo Corp',
          currency: 'USD',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          officeStartTime: '09:00',
          officeEndTime: '18:00',
          lateGracePeriod: 15,
          earlyOutGracePeriod: 15,
          earliestCheckIn: '06:00',
          autoSessionCloseTime: '23:59',
          autoAbsentEnabled: true,
          autoAbsentTime: '23:55',
        }),
      },
      {
        organization_id: orgId,
        key: 'departments',
        value: JSON.stringify(['Engineering', 'HR', 'Sales', 'Marketing', 'Operations', 'Finance', 'Management']),
      },
      {
        organization_id: orgId,
        key: 'designations',
        value: JSON.stringify(['Manager', 'Lead', 'Senior', 'Associate', 'Junior', 'Intern', 'Director', 'Specialist']),
      },
      {
        organization_id: orgId,
        key: 'leave_policy',
        value: JSON.stringify({ defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 }, overrides: {} }),
      },
      {
        organization_id: orgId,
        key: 'holidays',
        value: JSON.stringify([
          { id: 'us-h1', date: '2026-01-01', name: "New Year's Day", isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h2', date: '2026-01-19', name: 'Martin Luther King Jr. Day', isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h3', date: '2026-02-16', name: "Presidents' Day", isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h4', date: '2026-05-25', name: 'Memorial Day', isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h5', date: '2026-06-19', name: 'Juneteenth', isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h6', date: '2026-07-04', name: 'Independence Day', isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h7', date: '2026-09-07', name: 'Labor Day', isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h8', date: '2026-10-12', name: 'Columbus Day', isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h9', date: '2026-11-11', name: 'Veterans Day', isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h10', date: '2026-11-26', name: 'Thanksgiving Day', isGovernment: true, type: 'NATIONAL' },
          { id: 'us-h11', date: '2026-12-25', name: 'Christmas Day', isGovernment: true, type: 'FESTIVAL' },
        ]),
      },
    ];

    for (const row of settingsRows) {
      const { error: settingsErr } = await supabase
        .from('settings')
        .upsert(row, { onConflict: 'organization_id, key' });

      if (settingsErr) {
        console.error(`[demo-reset] Settings ${row.key} upsert failed: ${settingsErr.message}`);
      } else {
        console.log(`[demo-reset] Ensured settings row: ${row.key}`);
      }
    }

    // ── Step 9: Ensure teams exist ────────────────────────────────────────────
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('organization_id', orgId);

    if (!existingTeams || existingTeams.length === 0) {
      const teamRows = [
        { organization_id: orgId, name: 'Engineering', description: 'Software engineering and product development' },
        { organization_id: orgId, name: 'Marketing', description: 'Brand, content, and growth marketing' },
      ];

      const teamInsert = await supabase.from('teams').insert(teamRows).select('id');
      if (teamInsert.error) {
        console.error(`[demo-reset] Teams seed failed: ${teamInsert.error.message}`);
      } else {
        console.log(`[demo-reset] Inserted ${teamInsert.data.length} teams`);

        // Assign profiles to teams
        if (teamInsert.data.length >= 2 && otherProfiles.length >= 2) {
          await supabase.from('profiles').update({ team_id: teamInsert.data[0].id }).eq('id', otherProfiles[0].id);
          await supabase.from('profiles').update({ team_id: teamInsert.data[1].id }).eq('id', otherProfiles[1].id);
        }
      }
    }

    // ── Step 10: Ensure default shift exists ──────────────────────────────────
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('organization_id', orgId);

    if (!existingShifts || existingShifts.length === 0) {
      const { error: shiftErr } = await supabase.from('shifts').insert({
        organization_id: orgId,
        name: 'Default Shift',
        start_time: '09:00',
        end_time: '18:00',
        work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        is_default: true,
      });

      if (shiftErr) {
        console.error(`[demo-reset] Shift seed failed: ${shiftErr.message}`);
      } else {
        console.log('[demo-reset] Inserted default shift');
      }
    }

    // ── Step 11: Update reset timestamp ──────────────────────────────────────
    await supabase
      .from('organizations')
      .update({ demo_reset_at: new Date().toISOString() })
      .eq('id', orgId);

    console.log('[demo-reset] ✅ Demo reset complete');
    return jsonResponse(200, {
      success: true,
      message: 'Demo data reset complete',
      orgId,
      stats: {
        attendance: attendanceRows.length,
        leaves: leaveRows.length,
        announcements: announcementRows.length,
        users: profiles.length,
      },
    });
  } catch (err) {
    console.error('[demo-reset] Unhandled error:', err);
    return jsonResponse(500, { error: 'Internal Server Error: ' + (err as Error).message });
  }
});
