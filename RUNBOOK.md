# EventPerfekt Platform — Operations Runbook

Last updated: 2026-07-01 (Phase 2). Covers the tender discovery loop's operational
surface: scheduler, health monitoring, alerts, database backup/restore, and build/typecheck.

---

## 1. Database — provider, backups & restore

### Provider
The production database is **Replit-managed PostgreSQL** (the connection host is
`helium` / `heliumdb`, Replit's internal Postgres proxy). Server version: PostgreSQL 16.

### ⚠️ Backups — ACTION REQUIRED (not verified from app side)
**Automated backups could NOT be verified from inside the application container** —
backup configuration lives in the Replit platform console, not in the app. Do **not**
assume backups exist until confirmed.

**Confirm in the Replit console:**
1. Open the Repl → **Database** (or **PostgreSQL**) pane.
2. Check the **Backups / Point-in-Time Recovery** section.
3. Confirm: (a) automated backups are **enabled**, (b) at least one **recent backup
   exists**, (c) the **frequency** (Replit managed Postgres typically takes automatic
   daily snapshots with point-in-time recovery on paid plans), and (d) the **retention
   window** (commonly 7 days — verify your plan).

If automated backups are **not** enabled, enable them now, or rely on the manual
backup below as an interim measure and raise this as a risk.

### Restore procedure (platform — preferred)
1. Replit console → Database pane → **Backups**.
2. Select the target restore point (snapshot timestamp or PITR time).
3. Follow the console **Restore** flow. Replit restores into the managed instance.
4. After restore, redeploy the app so it reconnects, then run the **post-restore
   checks** below.

### Manual backup (interim / extra safety)
`pg_dump` 16.10 is available in this environment. From a shell with `DATABASE_URL` set:

```bash
# Full logical backup (custom format — compressed, selective restore supported)
pg_dump "$DATABASE_URL" -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump

# Store the dump OFF the Repl (download it, or push to object storage / S3).
# A backup that lives only on the same host it protects is not a backup.
```

### Manual restore (from a pg_dump file)
```bash
# Into the SAME database (objects are dropped & recreated):
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backup_YYYYMMDD_HHMMSS.dump

# Or into a fresh database first to validate, then cut over:
createdb -T template0 ep_restore_test
pg_restore --no-owner -d "postgresql://.../ep_restore_test" backup_YYYYMMDD_HHMMSS.dump
```

### Post-restore checks
```sql
SELECT count(*) FROM saas_tenders;            -- tenders present
SELECT max(timestamp) FROM saas_automation_log WHERE action = 'sweep';  -- last sweep
SELECT overall, created_at FROM saas_health_status ORDER BY id DESC LIMIT 1;
```
Then hit `GET /api/health` and confirm the service responds.

---

## 2. Tender sweep — schedule, catch-up & resilience

- **Schedule:** the sweep runs daily at **07:00 UK time**; the daily digest email
  follows at **07:30 UK** (after the sweep). Implemented in
  `artifacts/api-server/src/tender-sweeper.ts` (`startTenderSweeper`) and
  `tender-deadline-mailer.ts`.
- **Missed-run catch-up (the real restart fix):** on every boot the sweeper reads the
  last sweep time from `saas_automation_log` (`action = 'sweep'`). If it has been
  **>24h** (or never), it **alerts ops and runs a catch-up sweep immediately**. This
  survives deploys/crashes/host recycles — a bare timer alone would silently skip a day.
- **Per-source isolation + retry:** each source (Contracts Finder, Find a Tender,
  Monitored Buyers, TED, Nigeria) runs independently with up to **3 retries**
  (exponential backoff). One source failing **does not** abort the others.

### Manual sweep trigger
A sweep can be invoked in-process via `runTenderSweep({ trigger: "manual" })` (e.g. from
an admin route or a REPL). It returns `{ ok, found, saved, highScore, health }`.

---

## 3. Health monitoring & alerts

- **Health record:** after every sweep, an org-scoped row is written to
  `saas_health_status` (overall status, per-source results, raw count, qualifying
  count, duration). See `tender-health.ts`.
- **Health endpoint:** `GET /api/health` returns process liveness **plus** the last
  sweep's `overall` status and per-source breakdown (served from an in-memory snapshot
  — no DB call, so it stays up even if the DB is down). Point external uptime monitors
  here.
- **Alert email** (subject prefix `⚠️ Tender sweep`) is sent to **`OPS_RECIPIENT`**
  (defaults to `DIGEST_RECIPIENT`) when **any** of:
  - the sweep failed entirely, or
  - any source returned an error, or
  - any scraper source is **degraded** (0 results / structure changed), or
  - **0 raw notices** were fetched across all sources, or
  - on boot, no successful sweep has run in **>24h**.

### Relevant environment variables
| Var | Purpose | Default |
|-----|---------|---------|
| `DATABASE_URL` | Postgres connection | (Replit-managed) |
| `OPS_RECIPIENT` | Sweep alert recipient | falls back to `DIGEST_RECIPIENT` |
| `DIGEST_RECIPIENT` | Daily digest recipient | `tenders@eventperfekt.com` |
| `TENDER_RELEVANCE_THRESHOLD` | Lane score gate (0–100) | `30` |
| `SME_MAX_CONTRACT_VALUE` | Ceiling above which a KNOWN-value tender is flagged `over-sme-capacity` and dropped from auto-qualify | `250000` |
| `TED_API_BASE` | TED v3 API base URL | `https://api.ted.europa.eu` |
| `NAMECHEAP_EMAIL` / `NAMECHEAP_PASSWORD` | Primary SMTP | — |
| `GMAIL_ADDRESS` / `GMAIL_APP_PASSWORD` | Fallback SMTP | — |

---

## 4. Common incidents

| Symptom | Likely cause | First action |
|---------|--------------|--------------|
| `⚠️ Tender sweep` email, source = `failed` | Source API/endpoint down or changed | Check the source URL manually; the sweep already retried 3×. Other sources still ran. |
| `⚠️` with `Nigeria` / scraper `degraded` | Scraped page structure changed | Inspect the live page; update the scraper selectors (`ng-tender-sources.ts`). |
| `⚠️ 0 raw notices fetched` | All sources broke, or network egress blocked | Check connectivity; verify each source endpoint. |
| `⚠️ missed run` on boot | Host recycled past 07:00 without running | Catch-up sweep already ran; confirm it succeeded via `/api/health`. |
| No daily digest email | SMTP not configured | Set Namecheap or Gmail env vars (see table). `emailService` falls back to logging. |

---

## 5. Build & typecheck

**Always run typecheck from the repo root, not from inside a package:**

```bash
pnpm run typecheck        # root: builds lib declarations first, THEN checks artifacts
```

The root script runs `tsc --build` (via `typecheck:libs`) to regenerate the composite
`lib/*` declaration output (`lib/db/dist/*.d.ts`) **before** typechecking the artifacts.

⚠️ **Gotcha:** running `pnpm run typecheck` *inside* a package (e.g.
`artifacts/api-server`) skips that step. Because api-server references `lib/db` as a
composite project, `tsc` reads the **compiled `lib/db/dist/*.d.ts`**, not the source —
so after editing a `lib/db` schema you get phantom "Property X does not exist" errors
against fields that plainly exist in `lib/db/src`. The `dist` declarations are just
stale. Fix by rebuilding the lib (or just run the root command):

```bash
tsc --build lib/db        # regenerate stale declaration output
```

Note: `pnpm run build` (esbuild) only transpiles — it does **not** typecheck. A green
build does not mean the types are sound; run the typecheck above.
