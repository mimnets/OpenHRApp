# OpenHR — Scaling & Rush-Hour Performance Plan

**Author:** Claude Code
**Date:** 2026-04-19
**Status:** Proposal — pending review
**Scope:** Diagnose 2–5 minute load stalls during morning check-in and evening check-out bursts, and lay out a phased path from today (16 orgs / ~100 users / 1 PocketBase) to a horizontally scalable architecture.

---

## 1. TL;DR

> **You almost certainly do NOT need a load balancer or a second PocketBase server yet.** The symptoms you are describing at your current scale (16 orgs, ~100 users) are overwhelmingly caused by **client-side over-fetching, server-side cron contention, and SQLite's single-writer lock being held too long** — not by the server being out of CPU or RAM.
>
> PocketBase routinely serves **10,000+ concurrent realtime clients on a $4 Hetzner VPS** ([benchmark](https://github.com/pocketbase/pocketbase/discussions/2757)). Your 100 users hitting check-in at 9:00 AM is ~5 writes/second — three orders of magnitude below the hardware limit. Fix the software first; add infrastructure second.
>
> **Horizontal scaling with multiple PocketBase instances is officially NOT supported** ([PocketBase FAQ](https://pocketbase.io/faq/)). SQLite allows only one writer at a time — you cannot simply put two PB instances behind a load balancer pointing at one DB. A true multi-writer setup requires migrating off PocketBase (Supabase/Postgres) or adopting a read-replica pattern with a single write primary.

This document proposes a **4-phase plan**: quick wins → vertical scaling → read replicas → horizontal / platform migration. Phases 1–2 will almost certainly resolve the current 2–5 minute stalls and carry you to 500–1,000 users on a single server.

---

## 2. Understanding PocketBase's Scaling Model (Industry Reality)

Before choosing a solution, we need to understand what PocketBase can and cannot do.

### 2.1 What PocketBase can handle

| Metric | Reported capacity | Source |
|---|---|---|
| Concurrent realtime connections | 10,000+ on 2 vCPU / 4 GB Hetzner VPS | [PB Discussion #2757](https://github.com/pocketbase/pocketbase/discussions/2757) |
| Record creates via API | 50,000 creates in ~1 minute on shared vCPU VPS | [PB FAQ](https://pocketbase.io/faq/) |
| Default read connection pool | 120 concurrent readers | [PB Discussion #5524](https://github.com/pocketbase/pocketbase/discussions/5524) |
| Default write connection pool | **1 writer at a time** (WAL mode) | [PB Discussion #5524](https://github.com/pocketbase/pocketbase/discussions/5524) |

**Your current load:** ~100 users × 2 check-ins/day = 200 writes/day, clustered around 2 ~15-minute windows. Peak = **~5–10 writes/second**. That is **nowhere near** PocketBase's limits.

### 2.2 What PocketBase CANNOT do out of the box

- **No horizontal scaling** — "PocketBase out of the box can run only on a single server so it can scale only vertically." ([PB FAQ](https://pocketbase.io/faq/))
- **No multi-writer** — SQLite WAL allows many readers but only **one writer at a time**. Two PB instances pointed at the same SQLite file will corrupt it.
- **Realtime events don't cross instances** — Realtime is fired from in-process Go hooks, not from DB triggers. A second PB node won't broadcast events that happened on node 1 ([PB Discussion #5586](https://github.com/pocketbase/pocketbase/discussions/5586)).

### 2.3 What options actually exist

1. **Vertical scaling** (bigger VPS) — works up to a point, easy, cheap.
2. **Read-replica pattern** — one primary writer, N read-only replicas synced via Litestream/Litesync. Your client code uses a read-PB for GETs and write-PB for mutations. Supported but requires app-level changes. ([PB Discussion #515](https://github.com/pocketbase/pocketbase/discussions/515))
3. **Managed PocketBase with built-in LB** — services like [Elest.io](https://elest.io/open-source/pocketbase/resources/managed-service-features) expose a load balancer across multiple PB replicas. Same read-replica model under the hood; the vendor handles the plumbing.
4. **Migrate to Postgres-based backend** (Supabase, Appwrite, custom) — true multi-writer, true horizontal scale, but a multi-month migration.

---

## 3. Diagnosis — Why the App Stalls for 2–5 Minutes at 9 AM

Based on reading the codebase, there are **four concrete root causes** that compound during rush hour. None of them are fixed by adding a second server.

### 3.1 `getFullList` is used in 39 places across 15 services

```
src/services/attendance.service.ts       — getFullList('attendance') with NO per-page, NO filter
src/services/superadmin.service.ts       — 12 getFullList calls
src/services/notification.service.ts     — 5 getFullList calls
src/services/review.service.ts           — 4 getFullList calls
src/services/leave.service.ts            — 2 getFullList calls
…(39 total)
```

`getFullList` fetches **every record in the collection** (paginated internally, but all fetched). As `attendance` grows (100 users × 250 workdays/year = 25,000 rows/year per org × 16 orgs = **400,000 rows/year**), every dashboard load drags more and more data over the wire. In a year this will be minutes, not seconds.

**File:** `src/services/attendance.service.ts:47`
```ts
const records = await apiClient.pb.collection('attendance').getFullList({ sort: '-date' });
```
No `filter`, no `perPage`, no date range. The 2-minute in-memory cache helps, but only after the first caller eats the full fetch — and every tab / device re-fetches independently.

### 3.2 Two cron jobs run EVERY MINUTE and hold the write lock

**File:** `Others/pb_hooks/cron.pb.js`
- Line 182: `cronAdd("auto_close_sessions", "* * * * *", …)` — scans attendance, closes stale sessions, **writes**.
- Line 313: `cronAdd("auto_absent_check", "* * * * *", …)` — scans users, marks absent, **writes**.

Both run at `:00` of every minute. SQLite allows one writer; if either cron is mid-transaction when a user taps "Check In" at 9:00:00, that user waits. If the cron is scanning all attendance for all orgs, it can hold the lock for seconds at a time. **Every user who checks in during that window queues behind the cron.**

### 3.3 No per-user / per-org filtering at the client

Many services rely on PB's API rules for org filtering but still fetch the **whole collection** before the rule filters it. Even if the rule denies most rows, the server still scans them. With 16 orgs in one `attendance` table, user A from Org 1 triggers a scan of rows belonging to Orgs 2–16 too.

### 3.4 Selfie uploads on the write path

`saveAttendance` does a WebP conversion + multipart upload of the selfie on the critical check-in path (line 81–98 of `attendance.service.ts`). During rush hour, 20 people uploading 100–500 KB selfies simultaneously over a mobile network saturates upload bandwidth and keeps connections open, starving other requests.

### 3.5 The 2–5 minute symptom, explained

At 9:00:00 AM:
1. 20 employees tap "Check In" within ~30 seconds.
2. `auto_close_sessions` cron fires at 9:00:00 and starts a transaction over all attendance rows.
3. Each employee's app loads the dashboard → triggers `getAttendance()` → `getFullList('attendance')` → pulls thousands of rows.
4. Each employee's app also calls `reconcileOpenSessions` → read + potential write.
5. 20 selfie uploads saturate the server's upload socket.
6. All 20 writes queue behind the cron and each other on SQLite's single-writer lock.
7. Clients see a 2–5 minute spinner.

At current scale (~100 users) the **server is not out of resources** — it is **serializing work that should be parallel or not happen at all**.

---

## 4. The 4-Phase Plan

### Phase 1 — Quick Wins (1–2 weeks, no infra change) ⭐ DO THIS FIRST

These will almost certainly eliminate the 2–5 minute stalls at your current scale and buy 5–10× headroom.

**1.1 Scope every `getFullList` with a `filter` and a date range**
- `attendance.getAttendance()` — default to last 30 days: `filter: 'date >= "{last30}"'`
- Replace `getFullList` with `getList(page, perPage, …)` for any UI that only needs recent data.
- Add `batch` size of 200 to remaining `getFullList` calls.

**1.2 Stagger the cron jobs, move them off the minute boundary**
- `auto_close_sessions` — change from `* * * * *` (every minute) to `*/5 * * * *` at `:03` (every 5 minutes, offset from :00 and :30). A session being closed 4 minutes later than "exactly at midnight" has zero business impact.
- `auto_absent_check` — change to `*/10 * * * *` at `:07`.
- **Do not run either cron between 08:45–09:30 and 17:30–19:00 local time.** Add a guard at the top of each handler that skips the run during check-in/out windows.

> Note: `cron.pb.js` is a **frozen module** per `Others/CLAUDE.md`. The plan-approval gate must be followed before these edits — this document serves as that plan.

**1.3 Decouple selfie upload from the check-in confirmation**
- Create the attendance record **first** (tiny payload, fast write), return success to the user.
- Upload the selfie in a second background request and `PATCH` the record with the file URL when done.
- User sees "Checked in ✓" in <500 ms instead of waiting for the photo to upload.

**1.4 Add HTTP cache headers for read-only endpoints**
- Dashboard stats, announcements, holidays — `Cache-Control: private, max-age=60` at the PB hook level for GET responses that don't mutate.

**1.5 Tune PocketBase's SQLite pragmas**
Add to PB startup flags (or `pb_data/settings.json`):
```
--queryTimeout=30
```
And in a boot hook, run once:
```js
$app.db().newQuery("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA cache_size=-64000; PRAGMA mmap_size=268435456; PRAGMA busy_timeout=5000;").execute()
```
(`synchronous=NORMAL` is the standard production setting for WAL — much faster, same durability as long as the server doesn't crash mid-write. `busy_timeout=5000` makes writers wait 5 s for the lock instead of failing immediately.)

**1.6 Add frontend request batching to dashboard load**
Currently the dashboard fires ~8 parallel requests on mount (attendance, leaves, notifications, announcements, org config, shifts, employees, reviews). Collapse into a single `/api/openhr/dashboard` PB hook endpoint that returns one JSON payload with only what's needed for the visible widgets.

**Expected outcome:** Check-in p95 under 2 seconds; dashboard load under 3 seconds; no more 2–5 minute stalls.

---

### Phase 2 — Vertical Scaling + Monitoring (2–4 weeks)

When users exceed ~300 or orgs exceed 40, do this.

**2.1 Move to a properly-sized VPS**
- Current server: unknown (whatever `pocketbase.mimnets.com` runs on). Confirm specs.
- Target: 4 vCPU / 8 GB RAM / NVMe SSD. Hetzner CPX31 (~€15/mo) or Hetzner CCX13 (dedicated 2 vCPU / 8 GB) is plenty for 1,000+ users.
- SSD matters more than CPU for SQLite. **Do not run PocketBase on HDD or networked storage (EFS, NFS, EBS gp2).** Local NVMe only.

**2.2 Add observability**
- Deploy [Uptime Kuma](https://github.com/louislam/uptime-kuma) (self-hosted, free) → monitor PB `/api/health` every 30 s.
- Deploy [Netdata](https://www.netdata.cloud/) or Grafana+Prometheus on the PB host → CPU, RAM, disk I/O, open connections.
- Add a PB hook that logs every request >2 s to a `slow_requests` collection. Review weekly.

**2.3 Put a CDN / reverse proxy in front**
- [Cloudflare](https://cloudflare.com) (free tier) in front of `pocketbase.mimnets.com`.
- Proxy-only (orange cloud), cache static files (selfies!) aggressively, pass through API requests.
- This alone can cut perceived load times 30–50% for repeated visits.

**2.4 Move selfies off SQLite/local disk**
- PocketBase supports S3 storage for file fields (`pb settings → Files`).
- Point at Cloudflare R2 (egress-free) or Backblaze B2 (~$5/TB/mo).
- Massive win: reduces PB disk I/O, keeps DB small (faster backups, faster queries), and selfies load from edge.

**Expected outcome:** Comfortable headroom for 500–1,000 concurrent users on one box.

---

### Phase 3 — Read Replicas + Single-Writer LB (when you hit ~1,000 users / ~50 orgs)

Only do this when Phase 2 monitoring shows sustained CPU >60% or disk I/O saturation. For OpenHR's workload (read-heavy — dashboards, listings, logs) this pattern is a very good fit.

**3.1 Architecture**

```
                    ┌──────────────────┐
                    │  Cloudflare CDN  │
                    └────────┬─────────┘
                             ▼
                   ┌─────────────────────┐
                   │  Nginx / Caddy LB   │
                   │  (path-based split) │
                   └────┬───────────┬────┘
                        │           │
         GET / realtime │           │ POST / PATCH / DELETE
                        ▼           ▼
              ┌────────────────┐ ┌──────────────────┐
              │ PB read node 1 │ │ PB write primary │
              │ PB read node 2 │ │ (single writer)  │
              │ PB read node N │ └────────┬─────────┘
              └────────▲───────┘          │
                       │ Litestream       │ writes
                       │ replication      ▼
                       └──────────── SQLite WAL
```

**3.2 Implementation**
- Deploy N read replicas (start with 2). Each runs PB with the SQLite file replicated from the primary via [Litestream](https://litestream.io/) or [Litesync](https://litesync.io/).
- Reverse proxy (Caddy or Nginx) routes:
  - `GET /api/collections/*/records*` → round-robin to read nodes
  - `POST|PATCH|DELETE /api/collections/*` → always primary
  - `/api/realtime` → sticky session, prefer primary (realtime needs in-process hooks)
  - `/api/openhr/*` custom routes → primary (safest; they often write)
- App changes: split the PB client into `pbRead` and `pbWrite` in `src/services/pocketbase.ts`. Most services use `pbRead`; mutators use `pbWrite`.

**3.3 Trade-offs**
- **Replication lag** — reads may be a few seconds stale. For dashboards and logs, acceptable. After a write, force the next read from primary for 5 seconds ("read-your-writes" pattern) — store a timestamp in `sessionStorage`.
- **Realtime** — events fire only where the write happened. Clients must subscribe to the primary. Acceptable; one persistent WS connection per client.
- **Complexity** — adds a new class of bug (stale reads). Do not adopt without the monitoring from Phase 2.

**3.4 The "auto-fail-over to alternative PocketBase" idea you mentioned**
> "when it would request more than 5 or 10 concurrent it will distribute the load into different servers"

Concurrency-based routing is **not the right trigger** — the LB doesn't know if a request is cheap or expensive. The standard industry approach is:
- **Read/write split** (what Phase 3 describes) — route by HTTP verb, not concurrency.
- **Least-connections or round-robin** balancing across read nodes — Nginx/Caddy does this automatically.
- Automatic fail-over: if a read node stops responding to health checks (`GET /api/health`), the LB removes it from the pool for 30 s. This is a one-line Caddy config.

---

### Phase 4 — Platform Migration (only if you outgrow Phase 3)

Trigger: >5,000 concurrent users, or your product needs multi-region, or you need true multi-writer (e.g. you add a feature that does heavy concurrent writes like real-time chat).

Options, in order of effort:

| Option | Effort | Pros | Cons |
|---|---|---|---|
| **Managed PocketBase** (Elest.io, PocketHost+LB) | 1 week | Keep your codebase. Vendor handles replicas. | Vendor lock-in, cost scales fast. |
| **Supabase** (Postgres + PostgREST + Realtime) | 2–4 months | True horizontal scale, SQL, row-level security maps well to your multi-tenant model. Free tier generous. | Re-architect: different auth, different query API, different realtime. |
| **Self-hosted Postgres + custom API** | 6+ months | Full control. | You become a backend team. |

Personal recommendation if you ever get there: **Supabase**. Your multi-tenant `organization_id` filtering pattern maps 1:1 to Postgres RLS policies, and the React + Realtime story is very close to PocketBase's. You have a playbook stub already at `Others/supabase-setup-playbook.md`.

---

## 5. Recommendation — Where to Start

1. **Week 1:** Phase 1.1 (scope `getFullList`), 1.2 (stagger crons), 1.5 (SQLite pragmas). These are cheap, reversible, and target the actual bottleneck.
2. **Week 2:** Phase 1.3 (async selfies), 1.6 (dashboard endpoint batching). Measure with synthetic rush-hour load (k6 or Artillery — script 100 users hitting check-in within 30 s).
3. **Month 2:** Phase 2.1 (right-sized VPS), 2.2 (monitoring), 2.3 (Cloudflare), 2.4 (S3 for selfies).
4. **Revisit in 6 months** with real metrics. Only consider Phase 3 if monitoring proves you need it.

**Do not** jump straight to load balancers and extra PocketBase nodes. You will spend weeks on infrastructure, break realtime, introduce stale-read bugs, and the 9 AM stall will still be there — because the root cause is in the client and the cron jobs, not the server count.

---

## 6. Budget Rough-Cut

| Phase | Infra cost delta | Engineering time |
|---|---|---|
| Phase 1 | $0 | ~40 hours |
| Phase 2 | ~$20–40/mo (bigger VPS + Cloudflare free + R2 ~$1/mo) | ~30 hours |
| Phase 3 | ~$60–100/mo (3× PB nodes + LB) | ~80–120 hours |
| Phase 4 | varies ($0 Supabase free tier → $25–500+/mo) | 2–6 months |

---

## 7. Open Questions for You

1. What VPS provider/specs is `pocketbase.mimnets.com` on today? (Needed to right-size Phase 2.)
2. Do you have server access logs for a typical 9 AM window? If so, we can confirm the diagnosis with real numbers before changing code.
3. Is there an SLA commitment to customers? (Affects how aggressively we stagger crons and tolerate stale reads.)
4. Selfie retention policy — how long must we keep them? (Affects S3 lifecycle rules.)

---

## 8. References

- [PocketBase FAQ — scaling & performance](https://pocketbase.io/faq/)
- [PB Discussion #515 — Load balancer patterns](https://github.com/pocketbase/pocketbase/discussions/515)
- [PB Discussion #2184 — PocketBase and its scaling](https://github.com/pocketbase/pocketbase/discussions/2184)
- [PB Discussion #2757 — Latest benchmarks (10k+ clients on $4 VPS)](https://github.com/pocketbase/pocketbase/discussions/2757)
- [PB Discussion #5524 — Concurrent write limits](https://github.com/pocketbase/pocketbase/discussions/5524)
- [PB Discussion #5586 — Scaling advice](https://github.com/pocketbase/pocketbase/discussions/5586)
- [Elest.io managed PocketBase with LB](https://elest.io/open-source/pocketbase/resources/managed-service-features)
- [Litestream — SQLite streaming replication](https://litestream.io/)
- Internal: `Others/CLAUDE.md` — frozen modules change control
- Internal: `Others/pb_hooks/cron.pb.js` — cron schedules
- Internal: `src/services/attendance.service.ts:47` — `getFullList` on attendance

---
*End of plan. Review, comment, and we can turn any section into a concrete task list.*
