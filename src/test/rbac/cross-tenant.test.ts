/**
 * Cross-tenant data-bleed tests.
 *
 * For every protected table, we sign in as Admin / Manager / Staff of Shop A
 * and try to read, modify, or delete data belonging to Shop B.
 *
 * In Supabase / PostgREST, RLS-blocked SELECTs return an empty array (200),
 * and RLS-blocked INSERT/UPDATE/DELETE either:
 *   - return PostgREST error code "42501" (insufficient privilege), OR
 *   - silently affect 0 rows (when the row simply isn't visible).
 *
 * Either outcome is a pass — what matters is that NO Shop B row is read or
 * mutated. We assert that explicitly by re-reading with the service role.
 *
 * Run:  bunx vitest run --config vitest.rbac.config.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  adminClient,
  anonClient,
  seedWorld,
  signedInClient,
  teardownWorld,
  Role,
  SeededWorld,
} from "./setup";

let world: SeededWorld;
const clients: Record<string, SupabaseClient> = {};

beforeAll(async () => {
  world = await seedWorld();
  for (const role of ["admin", "manager", "staff"] as Role[]) {
    clients[`A-${role}`] = await signedInClient(
      world.shopA.users[role].email,
      world.shopA.users[role].password,
    );
    clients[`B-${role}`] = await signedInClient(
      world.shopB.users[role].email,
      world.shopB.users[role].password,
    );
  }
});

afterAll(async () => {
  if (world) await teardownWorld(world);
});

const aRoles: Role[] = ["admin", "manager", "staff"];

describe("Cross-tenant SELECTs return zero Shop B rows for Shop A users", () => {
  const tablesWithShopId = [
    "appointments",
    "appointment_services",
    "clients",
    "inventory",
    "product_sales",
    "expenses",
    "transactions",
    "business_settings",
    "shop_members",
  ] as const;

  for (const table of tablesWithShopId) {
    for (const role of aRoles) {
      it(`Shop A ${role} cannot SELECT ${table} rows of Shop B`, async () => {
        const c = clients[`A-${role}`];
        const { data, error } = await c
          .from(table)
          .select("*")
          .eq("shop_id", world.shopB.shopId);

        // Either an explicit RLS error or an empty result — both are acceptable.
        if (error) {
          expect(error.code === "42501" || error.code === "PGRST301").toBe(true);
        } else {
          expect(data ?? []).toEqual([]);
        }
      });
    }
  }

  it("Shop A admin cannot SELECT Shop B's shop row", async () => {
    const { data } = await clients["A-admin"]
      .from("shops")
      .select("id")
      .eq("id", world.shopB.shopId);
    expect(data ?? []).toEqual([]);
  });
});

describe("Cross-tenant WRITEs cannot touch Shop B data", () => {
  it("Shop A admin cannot UPDATE a Shop B appointment", async () => {
    const { error } = await clients["A-admin"]
      .from("appointments")
      .update({ status: "Cancelled" })
      .eq("id", world.shopB.appointmentId);
    // Permitted to be either a hard error or a no-op; assert the row is unchanged.
    expect(error?.code).not.toBe("23505");
    const after = await adminClient()
      .from("appointments")
      .select("status")
      .eq("id", world.shopB.appointmentId)
      .single();
    expect(after.data!.status).not.toBe("Cancelled");
  });

  it("Shop A admin cannot DELETE a Shop B client", async () => {
    await clients["A-admin"]
      .from("clients")
      .delete()
      .eq("id", world.shopB.clientId);
    const after = await adminClient()
      .from("clients")
      .select("id")
      .eq("id", world.shopB.clientId)
      .maybeSingle();
    expect(after.data?.id).toBe(world.shopB.clientId);
  });

  it("Shop A admin cannot INSERT an appointment with shop_id = Shop B", async () => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const { data, error } = await clients["A-admin"]
      .from("appointments")
      .insert({
        shop_id: world.shopB.shopId, // forged
        client_id: world.shopB.clientId,
        service_id: world.shopB.serviceId,
        staff_id: world.shopB.staffRecordIds.staff,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })
      .select("id");
    // RLS WITH CHECK must reject this.
    expect(error).toBeTruthy();
    expect(data ?? []).toEqual([]);
  });

  it("Shop A admin cannot INSERT a client into Shop B", async () => {
    const { error } = await clients["A-admin"]
      .from("clients")
      .insert({
        shop_id: world.shopB.shopId,
        first_name: "Forged",
        last_name: "Client",
        phone_mobile: "+30999999999",
      });
    expect(error).toBeTruthy();
  });

  it("Shop A admin cannot UPDATE Shop B's business settings", async () => {
    await clients["A-admin"]
      .from("business_settings")
      .update({ shop_name: "PWNED" })
      .eq("shop_id", world.shopB.shopId);
    const after = await adminClient()
      .from("business_settings")
      .select("shop_name")
      .eq("shop_id", world.shopB.shopId)
      .single();
    expect(after.data!.shop_name).not.toBe("PWNED");
  });

  it("Shop A admin cannot UPDATE Shop B's inventory stock", async () => {
    await clients["A-admin"]
      .from("inventory")
      .update({ current_stock: 0 })
      .eq("id", world.shopB.inventoryId);
    const after = await adminClient()
      .from("inventory")
      .select("current_stock")
      .eq("id", world.shopB.inventoryId)
      .single();
    expect(after.data!.current_stock).toBe(20);
  });

  it("Shop A admin cannot DELETE Shop B's service", async () => {
    await clients["A-admin"]
      .from("services")
      .delete()
      .eq("id", world.shopB.serviceId);
    const after = await adminClient()
      .from("services")
      .select("id")
      .eq("id", world.shopB.serviceId)
      .maybeSingle();
    expect(after.data?.id).toBe(world.shopB.serviceId);
  });
});

describe("Within-tenant RBAC: Staff cannot do Admin/Manager-only writes", () => {
  it("Shop A staff cannot INSERT an expense in their OWN shop", async () => {
    const { error } = await clients["A-staff"]
      .from("expenses")
      .insert({
        shop_id: world.shopA.shopId,
        amount: 10,
        category: "Other",
        description: "Should be denied for staff",
      });
    expect(error).toBeTruthy();
  });

  it("Shop A staff cannot INSERT inventory in their OWN shop", async () => {
    const { error } = await clients["A-staff"]
      .from("inventory")
      .insert({
        shop_id: world.shopA.shopId,
        product_name: "Forbidden",
        cost_price: 1,
        retail_price: 2,
        current_stock: 1,
      });
    expect(error).toBeTruthy();
  });

  it("Shop A staff cannot INSERT a staff member", async () => {
    const { error } = await clients["A-staff"]
      .from("staff")
      .insert({
        shop_id: world.shopA.shopId,
        first_name: "Forbidden",
        last_name: "Hire",
        phone: "0",
        role: "Stylist",
      });
    expect(error).toBeTruthy();
  });

  it("Shop A manager CAN insert a client in their OWN shop (positive control)", async () => {
    const { data, error } = await clients["A-manager"]
      .from("clients")
      .insert({
        shop_id: world.shopA.shopId,
        first_name: "Manager",
        last_name: "Created",
        phone_mobile: `+30${Math.floor(1e9 + Math.random() * 9e9)}`,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    if (data?.id) {
      await adminClient().from("clients").delete().eq("id", data.id);
    }
  });
});

describe("Anon role cannot read or write PII tables", () => {
  it("anon cannot SELECT clients", async () => {
    const a = anonClient();
    const { data, error } = await a.from("clients").select("*").limit(1);
    if (error) {
      expect(error.code === "42501" || error.code === "PGRST301").toBe(true);
    } else {
      expect(data ?? []).toEqual([]);
    }
  });

  it("anon cannot SELECT appointments", async () => {
    const a = anonClient();
    const { data, error } = await a.from("appointments").select("*").limit(1);
    if (error) {
      expect(error.code === "42501" || error.code === "PGRST301").toBe(true);
    } else {
      expect(data ?? []).toEqual([]);
    }
  });

  it("anon cannot INSERT a client directly", async () => {
    const a = anonClient();
    const { error } = await a.from("clients").insert({
      shop_id: world.shopA.shopId,
      first_name: "Anon",
      last_name: "Forged",
      phone_mobile: "+300000000000",
    });
    expect(error).toBeTruthy();
  });

  it("anon CAN call public_get_booked_slots for any shop slug (positive control)", async () => {
    const a = anonClient();
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await a.rpc("public_get_booked_slots", {
      _shop_slug: world.shopA.slug,
      _date: today,
    });
    expect(error).toBeNull();
  });
});

describe("Public RPC cannot be tricked into cross-shop writes", () => {
  it("public_create_booking rejects a service from a different shop", async () => {
    const a = anonClient();
    const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const { error } = await a.rpc("public_create_booking", {
      _shop_slug: world.shopA.slug,
      _service_id: world.shopB.serviceId, // service belongs to Shop B
      _staff_id: null,
      _start_time: start.toISOString(),
      _end_time: end.toISOString(),
      _first_name: "Mallory",
      _last_name: "X",
      _email: "mallory@rbac-test.local",
      _phone: "+300000000001",
      _phone_normalized: "+300000000001",
    });
    expect(error).toBeTruthy();
  });

  it("public_create_booking rejects a staff from a different shop", async () => {
    const a = anonClient();
    const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const { error } = await a.rpc("public_create_booking", {
      _shop_slug: world.shopA.slug,
      _service_id: world.shopA.serviceId,
      _staff_id: world.shopB.staffRecordIds.staff, // staff belongs to Shop B
      _start_time: start.toISOString(),
      _end_time: end.toISOString(),
      _first_name: "Mallory",
      _last_name: "X",
      _email: "mallory@rbac-test.local",
      _phone: "+300000000002",
      _phone_normalized: "+300000000002",
    });
    expect(error).toBeTruthy();
  });
});
