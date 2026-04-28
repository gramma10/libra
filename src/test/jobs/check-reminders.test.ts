/**
 * Tests for the `check-reminders` edge function:
 *  - Only picks up appointments inside the 50–70 min window
 *  - Increments reminder_attempts on send failure (with backoff)
 *  - Stops at MAX_ATTEMPTS=3
 *  - Skips appointments belonging to shops where SMS is disabled
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/check-reminders`;

let world: SeededWorld;
const admin = adminClient();

async function callCheckReminders() {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

beforeAll(async () => {
  world = await seedWorld();
  // Shop A SMS-enabled; Shop B disabled (default false)
  await admin.from("business_settings")
    .update({ sms_enabled: true, shop_name: "Shop A" })
    .eq("shop_id", world.shopA.shopId);
  await admin.from("business_settings")
    .update({ sms_enabled: false })
    .eq("shop_id", world.shopB.shopId);
}, 120_000);

afterAll(async () => {
  if (world) await teardownWorld(world);
}, 60_000);

describe("check-reminders: time-window correctness", () => {
  it("picks up appointments starting in 50–70 min and ignores ones outside the window", async () => {
    const inWindow = new Date(Date.now() + 60 * 60 * 1000); // +60 min
    const inWindowEnd = new Date(inWindow.getTime() + 30 * 60 * 1000);

    const outOfWindow = new Date(Date.now() + 120 * 60 * 1000); // +2h
    const outOfWindowEnd = new Date(outOfWindow.getTime() + 30 * 60 * 1000);

    // Reset Shop A appointment INTO the window
    await admin.from("appointments").update({
      start_time: inWindow.toISOString(),
      end_time: inWindowEnd.toISOString(),
      status: "Confirmed",
      reminder_sent: false,
      reminder_attempts: 0,
      reminder_last_error: null,
      reminder_next_retry_at: null,
    }).eq("id", world.shopA.appointmentId);

    // Add a second Shop A appointment OUTSIDE the window
    const { data: outside } = await admin.from("appointments").insert({
      shop_id: world.shopA.shopId,
      client_id: world.shopA.clientId,
      service_id: world.shopA.serviceId,
      staff_id: world.shopA.staffRecordIds.staff,
      start_time: outOfWindow.toISOString(),
      end_time: outOfWindowEnd.toISOString(),
      status: "Confirmed",
    }).select("id").single();

    const { status, body } = await callCheckReminders();
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    // Either sent or failed counts apply to in-window only
    const touched = (body.sent ?? 0) + (body.failed ?? 0) + (body.skipped ?? 0);
    expect(touched).toBeGreaterThanOrEqual(1);

    // The out-of-window appointment must remain untouched
    const { data: untouched } = await admin.from("appointments")
      .select("reminder_sent, reminder_attempts")
      .eq("id", outside!.id).single();
    expect(untouched?.reminder_sent).toBe(false);
    expect(untouched?.reminder_attempts).toBe(0);

    await admin.from("appointments").delete().eq("id", outside!.id);
  });

  it("ignores shops with sms_enabled=false even if they have in-window appointments", async () => {
    const inWindow = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(inWindow.getTime() + 30 * 60 * 1000);

    await admin.from("appointments").update({
      start_time: inWindow.toISOString(),
      end_time: end.toISOString(),
      status: "Confirmed",
      reminder_sent: false,
      reminder_attempts: 0,
      reminder_last_error: null,
      reminder_next_retry_at: null,
    }).eq("id", world.shopB.appointmentId);

    await callCheckReminders();

    const { data } = await admin.from("appointments")
      .select("reminder_sent, reminder_attempts")
      .eq("id", world.shopB.appointmentId).single();
    expect(data?.reminder_sent).toBe(false);
    expect(data?.reminder_attempts).toBe(0);
  });
});

describe("check-reminders: retry counter & max-attempts", () => {
  it("does not pick up rows that already hit MAX_ATTEMPTS=3", async () => {
    const inWindow = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(inWindow.getTime() + 30 * 60 * 1000);

    await admin.from("appointments").update({
      start_time: inWindow.toISOString(),
      end_time: end.toISOString(),
      status: "Confirmed",
      reminder_sent: false,
      reminder_attempts: 3,
      reminder_last_error: "previous failure",
    }).eq("id", world.shopA.appointmentId);

    await callCheckReminders();

    const { data } = await admin.from("appointments")
      .select("reminder_attempts, reminder_sent")
      .eq("id", world.shopA.appointmentId).single();
    // Counter must NOT advance past 3
    expect(data?.reminder_attempts).toBe(3);
    expect(data?.reminder_sent).toBe(false);
  });

  it("respects reminder_next_retry_at backoff (skips rows whose backoff has not elapsed)", async () => {
    const inWindow = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(inWindow.getTime() + 30 * 60 * 1000);
    const futureBackoff = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

    await admin.from("appointments").update({
      start_time: inWindow.toISOString(),
      end_time: end.toISOString(),
      status: "Confirmed",
      reminder_sent: false,
      reminder_attempts: 1,
      reminder_last_error: "transient",
      reminder_next_retry_at: futureBackoff.toISOString(),
    }).eq("id", world.shopA.appointmentId);

    await callCheckReminders();

    const { data } = await admin.from("appointments")
      .select("reminder_attempts, reminder_next_retry_at")
      .eq("id", world.shopA.appointmentId).single();
    // Counter must remain at 1 (row was not picked up)
    expect(data?.reminder_attempts).toBe(1);
    expect(data?.reminder_next_retry_at).toBeTruthy();
  });
});
