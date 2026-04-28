# Cross-Tenant RBAC Tests

These tests **hit the live Supabase backend** to prove that Row Level Security
prevents store-to-store data bleed and that role permissions (Admin / Manager /
Staff) are enforced server-side.

## What gets verified

1. **Cross-tenant SELECTs** — A user signed in to Shop A receives **zero rows**
   when querying any of `appointments`, `appointment_services`, `clients`,
   `inventory`, `product_sales`, `expenses`, `transactions`, `business_settings`,
   `shop_members`, or `shops` for Shop B's `shop_id`.
2. **Cross-tenant WRITEs** — Updates / deletes targeting Shop B IDs are
   rejected (or silently no-op) and a service-role re-read confirms the row is
   unchanged. Forged `INSERT`s with `shop_id = Shop B` are rejected by RLS
   `WITH CHECK`.
3. **Within-tenant RBAC** — Staff cannot insert expenses, inventory, or staff
   in their own shop. Manager **can** insert clients (positive control).
4. **Anon role lockdown** — Direct `SELECT` / `INSERT` against `clients`,
   `appointments`, etc., are denied. The public RPCs (`public_get_booked_slots`,
   `public_create_booking`) work normally.
5. **RPC injection** — `public_create_booking` rejects a `service_id` or
   `staff_id` belonging to a different shop than the slug.

## Required env vars

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL (already in `.env`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key (already in `.env`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only**, used to seed/teardown test users |

`SUPABASE_SERVICE_ROLE_KEY` is **never** committed and **never** read from
client code. Get it from Lovable Cloud → Connectors → Lovable Cloud → Service
role key.

## Running

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  bunx vitest run --config vitest.rbac.config.ts
```

Or add to your shell profile / CI secret store and just run:

```bash
bunx vitest run --config vitest.rbac.config.ts
```

## What the tests do to the database

For each run the suite creates **two throwaway shops** (`rbac-A-…`, `rbac-B-…`)
each with three Supabase auth users (Admin / Manager / Staff), one client, one
service, one inventory item, and one future appointment. The `afterAll` hook
deletes both shops (FKs cascade to all child rows) and the six auth users.

If a run is interrupted, leftover rows can be cleaned manually:

```sql
DELETE FROM shops WHERE slug LIKE 'rbac-%';
-- then in Auth → Users, delete users whose emails end with @rbac-test.local
```

## Why integration over unit tests

RBAC lives in the database. Mocking the Supabase client would only verify that
the application calls the right methods — it would NOT verify that RLS
actually denies the request. These tests sign in as real users and watch the
real PostgREST responses.
