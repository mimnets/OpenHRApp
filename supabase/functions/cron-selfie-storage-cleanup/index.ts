// OpenHR — Selfie Storage Cleanup Cron
// Schedule: 0 2 * * * (daily 2 AM UTC)
//
// Deletes actual selfie files from Supabase Storage for attendance records
// older than the configured retention period, THEN nulls the DB column.
//
// The SQL-only cron (0009_cron_setup.sql) only nulls the selfie column —
// it cannot delete Storage objects because that requires a service-role
// HTTP call. This Edge Function fills that gap.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SELFIE_BUCKET = 'selfies';
const DEFAULT_RETENTION_DAYS = 30;
const MAX_DELETE_BATCH = 500; // Supabase Storage remove() limit per call

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const cronSecret = Deno.env.get('CRON_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization') || '';

  // Three valid ways to authenticate:
  // 1. pg_net internal call: Authorization: Bearer <CRON_SECRET> (bypasses Kong)
  // 2. External call with service_role key: Authorization: Bearer <service_role_key>
  // 3. External call with x-cron-secret header (when passing anon key to Kong)
  const cronHeader = req.headers.get('x-cron-secret');
  const isCronSecret = cronSecret && (authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret);
  const isServiceRole = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

  if (!isCronSecret && !isServiceRole) {
    return jsonResponse(401, { success: false, message: 'Unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  console.log('[cron-selfie-storage-cleanup] Starting selfie storage cleanup...');

  try {
    // ── Read retention setting ────────────────────────────────────────────
    let retentionDays = DEFAULT_RETENTION_DAYS;
    try {
      const { data: setting } = await admin
        .from('settings')
        .select('value')
        .eq('key', 'selfie_retention_days')
        .maybeSingle();
      if (setting?.value) {
        const parsed = parseInt(String(setting.value), 10);
        if (!isNaN(parsed) && parsed > 0) retentionDays = parsed;
      }
    } catch (e) {
      console.warn('[cron-selfie-storage-cleanup] Could not read retention setting, using default:', DEFAULT_RETENTION_DAYS);
    }

    // ── Calculate cutoff date ──────────────────────────────────────────────
    const cutoffDate = new Date();
    cutoffDate.setUTCHours(0, 0, 0, 0);
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    console.log(`[cron-selfie-storage-cleanup] Retention: ${retentionDays} days — cleaning selfies older than ${cutoffStr}`);

    // ── Fetch records with selfies older than cutoff ───────────────────────
    // Process in batches to handle large datasets
    let totalCleaned = 0;
    let totalErrors = 0;
    let totalStorageDeleted = 0;
    let hasMore = true;
    let page = 0;
    const pageSize = 500;

    while (hasMore) {
      const { data: records, error: fetchError } = await admin
        .from('attendance')
        .select('id, selfie')
        .lt('date', cutoffStr)
        .not('selfie', 'is', null)
        .order('date', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (fetchError) {
        console.error('[cron-selfie-storage-cleanup] Fetch error:', fetchError);
        break;
      }

      if (!records || records.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`[cron-selfie-storage-cleanup] Processing batch ${page + 1}: ${records.length} records`);

      // ── Collect unique selfie paths ────────────────────────────────────
      const paths: string[] = [];
      const recordIds: string[] = [];

      for (const r of records) {
        if (r.selfie && typeof r.selfie === 'string' && r.selfie.trim()) {
          paths.push(r.selfie.trim());
          recordIds.push(r.id);
        }
      }

      // ── Delete from Supabase Storage ────────────────────────────────────
      if (paths.length > 0) {
        // Supabase Storage remove() accepts up to 1000 paths per call,
        // but we chunk at MAX_DELETE_BATCH for safety.
        for (let i = 0; i < paths.length; i += MAX_DELETE_BATCH) {
          const chunk = paths.slice(i, i + MAX_DELETE_BATCH);
          try {
            const { data: delResult, error: delError } = await admin.storage
              .from(SELFIE_BUCKET)
              .remove(chunk);

            if (delError) {
              console.error(`[cron-selfie-storage-cleanup] Storage delete error (chunk ${i}):`, delError.message);
              totalErrors += chunk.length;
            } else {
              const deleted = delResult?.filter(d => d.error == null).length ?? chunk.length;
              totalStorageDeleted += deleted;
              if (delResult) {
                const failedInBatch = delResult.filter(d => d.error != null).length;
                totalErrors += failedInBatch;
              }
            }
          } catch (e: any) {
            console.error(`[cron-selfie-storage-cleanup] Storage delete exception (chunk ${i}):`, e?.message || e);
            totalErrors += chunk.length;
          }
        }
      }

      // ── Null the selfie column in DB ────────────────────────────────────
      if (recordIds.length > 0) {
        for (let i = 0; i < recordIds.length; i += 100) {
          const idChunk = recordIds.slice(i, i + 100);
          try {
            const { error: updateError } = await admin
              .from('attendance')
              .update({ selfie: null, updated: new Date().toISOString() })
              .in('id', idChunk);

            if (updateError) {
              console.error('[cron-selfie-storage-cleanup] DB update error:', updateError.message);
              totalErrors += idChunk.length;
            } else {
              totalCleaned += idChunk.length;
            }
          } catch (e: any) {
            console.error('[cron-selfie-storage-cleanup] DB update exception:', e?.message || e);
            totalErrors += idChunk.length;
          }
        }
      }

      page++;
      if (records.length < pageSize) hasMore = false;
    }

    // ── Log cleanup results ──────────────────────────────────────────────
    const logData = {
      lastRun: new Date().toISOString(),
      recordsCleaned: totalCleaned,
      storageFilesDeleted: totalStorageDeleted,
      errors: totalErrors,
      retentionDays,
      cutoffDate: cutoffStr,
    };

    try {
      const { data: existing } = await admin
        .from('settings')
        .select('id')
        .eq('key', 'selfie_cleanup_log')
        .maybeSingle();

      if (existing) {
        await admin
          .from('settings')
          .update({ value: JSON.stringify(logData), updated: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Insert into the first available organization (or leave org_id null)
        await admin.from('settings').insert({
          key: 'selfie_cleanup_log',
          value: JSON.stringify(logData),
        });
      }
    } catch (logErr: any) {
      console.warn('[cron-selfie-storage-cleanup] Could not persist cleanup log:', logErr?.message || logErr);
    }

    console.log(`[cron-selfie-storage-cleanup] Done. DB cleaned=${totalCleaned} storage_deleted=${totalStorageDeleted} errors=${totalErrors}`);
    return jsonResponse(200, {
      success: true,
      retentionDays,
      recordsCleaned: totalCleaned,
      storageFilesDeleted: totalStorageDeleted,
      errors: totalErrors,
    });

  } catch (err: any) {
    console.error('[cron-selfie-storage-cleanup] Fatal error:', err?.message || err);
    return jsonResponse(500, { success: false, message: err?.message || 'Internal error' });
  }
});
