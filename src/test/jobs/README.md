# Background Job Tests

Deterministic tests for cron-driven background jobs:

| Test file | What it verifies |
|-----------|------------------|
| `low-stock-and-auto-complete.test.ts` | `scan_low_stock_and_notify()` creates per-shop low-stock notifications, dedupes within a day, and upgrades severity to `critical` at zero stock. `auto_complete_past_appointments()` only touches past appointments and is idempotent. `reset_stale_reminder_retries()` clears retry counters older than 1 day. |
| `check-reminders.test.ts` | The `check-reminders` edge function only picks up appointments inside the **50–70 minute** window, ignores SMS-disabled shops, refuses to advance past `reminder_attempts = 3`, and respects the `reminder_next_retry_at` backoff. |

## Running

```bash
SUPABASE_SERVICE_ROLE_KEY=... bun run test:jobs
```

Both files reuse the seed helpers in `src/test/rbac/setup.ts` (Shop A + Shop B with admin/manager/staff users), so teardown happens automatically via shop deletion + auth user cleanup.

## Determinism notes

- **Time windows** are pinned with `new Date(Date.now() + N)` rather than fixed clocks, but the assertions check *categorical* membership (in window vs. out of window), not exact timestamps.
- **Dedupe** is keyed on `low_stock:<inventory_id>:<YYYY-MM-DD>` in `Europe/Athens`, so the same scan within a day collapses to one row regardless of how many times cron fires.
- **Retries** stop at `MAX_ATTEMPTS = 3` with backoffs of 5/15/45 min. The test asserts that rows at the cap are filtered out by the SQL query, not just by application logic.
