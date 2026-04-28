/**
 * Deterministic background-job tests (DB layer):
 *   - scan_low_stock_and_notify(): inserts/dedupes low-stock notifications
 *   - auto_complete_past_appointments(): closes past appointments
 *   - reset_stale_reminder_retries(): resets stuck retry rows
 *
 * Run: bunx vitest run --config vitest.rbac.config.ts src/test/jobs
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  seedWorld,
  teardownWorld,
  type SeededWorld,
} from "../rbac/setup";

let world: SeededWorld;
const admin = adminClient();

beforeAll(async () => {
  world = await seedWorld();
}, 120_000);

afterAll(async () => {
  if (world) await teardownWorld(world);
}, 60_000);

describe("scan_low_stock_and_notify()", () => {
  it("creates one warning notification per low-stock product, scoped to the right shop", async () => {
    // Drive Shop A inventory below threshold
    await admin.from("inventory")
      .update({ current_stock: 1, min_stock_level: 5 })
      .eq("id", world.shopA.inventoryId);

    // Shop B stays healthy
    await admin.from("inventory")
      .update({ current_stock: 50, min_stock_level: 5 })
      .eq("id", world.shopB.inventoryId);

    // Clear any pre-existing notifications for the seeded shops so the assertion is deterministic
    await admin.from("notifications").delete()
      .in("shop_id", [world.shopA.shopId, world.shopB.shopId]);

    const { data, error } = await admin.rpc("scan_low_stock_and_notify");
    expect(error).toBeNull();
    expect(typeof data).toBe("number");
    expect((data as number) >= 1).toBe(true);

    const { data: aNotifs } = await admin.from("notifications")
      .select("id, type, severity, payload, dedupe_key")
      .eq("shop_id", world.shopA.shopId);
    const { data: bNotifs } = await admin.from("notifications")
      .select("id")
      .eq("shop_id", world.shopB.shopId);

    expect(aNotifs?.length).toBe(1);
    expect(aNotifs![0].type).toBe("low_stock");
    expect(aNotifs![0].severity).toBe("warning");
    expect((aNotifs![0].payload as any).inventory_id).toBe(world.shopA.inventoryId);
    expect(bNotifs?.length).toBe(0);
  });

  it("is idempotent within the same day (dedupe_key prevents duplicates)", async () => {
    const before = await admin.from("notifications").select("id, updated_at")
      .eq("shop_id", world.shopA.shopId);
    expect(before.data?.length).toBe(1);
    const firstUpdatedAt = before.data![0].updated_at;

    // Run twice more
    await admin.rpc("scan_low_stock_and_notify");
    await admin.rpc("scan_low_stock_and_notify");

    const after = await admin.from("notifications").select("id, updated_at")
      .eq("shop_id", world.shopA.shopId);
    expect(after.data?.length).toBe(1); // still one row
    // updated_at should bump on conflict
    expect(after.data![0].updated_at >= firstUpdatedAt).toBe(true);
  });

  it("upgrades severity to 'critical' when stock hits zero", async () => {
    await admin.from("inventory").update({ current_stock: 0 })
      .eq("id", world.shopA.inventoryId);

    await admin.rpc("scan_low_stock_and_notify");

    const { data } = await admin.from("notifications")
      .select("severity").eq("shop_id", world.shopA.shopId).single();
    expect(data?.severity).toBe("critical");
  });
});

describe("auto_complete_past_appointments() — time-window correctness", () => {
  it("completes appointments whose end_time is in the past, leaves future ones alone", async () => {
    // Shop A appointment from seed is in the future — push it into the past
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
    const pastEnd = new Date(past.getTime() + 30 * 60 * 1000);

    await admin.from("appointments").update({
      start_time: past.toISOString(),
      end_time: pastEnd.toISOString(),
      status: "Confirmed",
      is_paid: false,
    }).eq("id", world.shopA.appointmentId);

    // Shop B appointment stays in the future (untouched)

    const { error } = await admin.rpc("auto_complete_past_appointments");
    expect(error).toBeNull();

    const { data: a } = await admin.from("appointments")
      .select("status, is_paid").eq("id", world.shopA.appointmentId).single();
    const { data: b } = await admin.from("appointments")
      .select("status, is_paid").eq("id", world.shopB.appointmentId).single();

    expect(a?.status).toBe("Completed");
    expect(a?.is_paid).toBe(true);
    // Future Shop B appointment must NOT be touched
    expect(b?.status).not.toBe("Completed");
    expect(b?.is_paid).toBe(false);
  });

  it("does not re-touch already-completed appointments", async () => {
    // Run again — should be a no-op for the already-completed row
    const { data: before } = await admin.from("appointments")
      .select("status").eq("id", world.shopA.appointmentId).single();
    expect(before?.status).toBe("Completed");

    await admin.rpc("auto_complete_past_appointments");

    const { data: after } = await admin.from("appointments")
      .select("status").eq("id", world.shopA.appointmentId).single();
    expect(after?.status).toBe("Completed");
  });
});

describe("reset_stale_reminder_retries()", () => {
  it("clears retry counters older than 1 day", async () => {
    // Build a fresh appointment in Shop B that's already 2 days old and stuck
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const end = new Date(twoDaysAgo.getTime() + 30 * 60 * 1000);

    const { data: appt, error: aErr } = await admin.from("appointments").insert({
      shop_id: world.shopB.shopId,
      client_id: world.shopB.clientId,
      service_id: world.shopB.serviceId,
      staff_id: world.shopB.staffRecordIds.staff,
      start_time: twoDaysAgo.toISOString(),
      end_time: end.toISOString(),
      status: "Confirmed",
      reminder_sent: false,
      reminder_attempts: 2,
      reminder_last_error: "stuck",
    }).select("id").single();
    expect(aErr).toBeNull();

    await admin.rpc("reset_stale_reminder_retries");

    const { data } = await admin.from("appointments")
      .select("reminder_attempts, reminder_last_error, reminder_next_retry_at")
      .eq("id", appt!.id).single();

    expect(data?.reminder_attempts).toBe(0);
    expect(data?.reminder_last_error).toBeNull();
    expect(data?.reminder_next_retry_at).toBeNull();

    await admin.from("appointments").delete().eq("id", appt!.id);
  });
});
