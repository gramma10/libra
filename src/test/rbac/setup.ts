/**
 * Seeds two isolated tenants (Shop A + Shop B) with Admin/Manager/Staff users
 * and one client + one service + one inventory item per shop.
 *
 * Uses the SERVICE ROLE key — never import this from the application bundle.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type Role = "admin" | "manager" | "staff";

export interface SeededUser {
  email: string;
  password: string;
  userId: string;
  role: Role;
}

export interface SeededShop {
  shopId: string;
  slug: string;
  staffRecordIds: Record<Role, string>;
  clientId: string;
  serviceId: string;
  inventoryId: string;
  appointmentId: string;
  users: Record<Role, SeededUser>;
}

export interface SeededWorld {
  shopA: SeededShop;
  shopB: SeededShop;
  admin: SupabaseClient; // service-role client (cleanup only)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
  throw new Error(
    "RBAC tests require VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY env vars",
  );
}

export const adminClient = (): SupabaseClient =>
  createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const anonClient = (): SupabaseClient =>
  createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Sign in a fresh client so it carries the user's JWT for RLS evaluation. */
export async function signedInClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const c = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return c;
}

const tag = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;

async function createUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user!.id;
}

async function seedShop(
  admin: SupabaseClient,
  label: string,
): Promise<SeededShop> {
  const slug = tag(`rbac-${label}`).toLowerCase();
  const adminEmail = `${slug}-admin@rbac-test.local`;
  const managerEmail = `${slug}-manager@rbac-test.local`;
  const staffEmail = `${slug}-staff@rbac-test.local`;
  const password = "Test_Password_123!";

  const adminId = await createUser(admin, adminEmail, password);
  const managerId = await createUser(admin, managerEmail, password);
  const staffId = await createUser(admin, staffEmail, password);

  // Create shop owned by admin
  const { data: shop, error: shopErr } = await admin
    .from("shops")
    .insert({ name: `Shop ${label}`, slug, owner_id: adminId })
    .select("id")
    .single();
  if (shopErr) throw new Error(`shop insert: ${shopErr.message}`);
  const shopId = shop.id as string;

  // business_settings + memberships
  await admin
    .from("business_settings")
    .insert({ shop_id: shopId, shop_name: `Shop ${label}` });

  await admin.from("shop_members").insert([
    { user_id: adminId, shop_id: shopId, role: "admin" },
    { user_id: managerId, shop_id: shopId, role: "manager" },
    { user_id: staffId, shop_id: shopId, role: "staff" },
  ]);

  // Staff records (link the auth users so My Stats / staff dashboards resolve)
  const { data: staffRows, error: staffInsErr } = await admin
    .from("staff")
    .insert([
      {
        shop_id: shopId,
        user_id: adminId,
        first_name: "Admin",
        last_name: label,
        phone: "0000000001",
        role: "Admin",
      },
      {
        shop_id: shopId,
        user_id: managerId,
        first_name: "Manager",
        last_name: label,
        phone: "0000000002",
        role: "Manager",
      },
      {
        shop_id: shopId,
        user_id: staffId,
        first_name: "Staff",
        last_name: label,
        phone: "0000000003",
        role: "Stylist",
      },
    ])
    .select("id, user_id");
  if (staffInsErr) throw new Error(`staff insert: ${staffInsErr.message}`);
  const staffRecordIds: Record<Role, string> = {
    admin: staffRows!.find((s) => s.user_id === adminId)!.id,
    manager: staffRows!.find((s) => s.user_id === managerId)!.id,
    staff: staffRows!.find((s) => s.user_id === staffId)!.id,
  };

  // Service
  const { data: svc, error: svcErr } = await admin
    .from("services")
    .insert({
      shop_id: shopId,
      service_name: "Test Service",
      duration: 30,
      price: 50,
      category_color: "#000000",
    })
    .select("id")
    .single();
  if (svcErr) throw new Error(`service insert: ${svcErr.message}`);

  // Client
  const { data: client, error: cliErr } = await admin
    .from("clients")
    .insert({
      shop_id: shopId,
      first_name: "Test",
      last_name: label,
      phone_mobile: `+30${Math.floor(1e9 + Math.random() * 9e9)}`,
      email: `client-${slug}@rbac-test.local`,
    })
    .select("id")
    .single();
  if (cliErr) throw new Error(`client insert: ${cliErr.message}`);

  // Inventory
  const { data: inv, error: invErr } = await admin
    .from("inventory")
    .insert({
      shop_id: shopId,
      product_name: "Test Product",
      cost_price: 5,
      retail_price: 10,
      current_stock: 20,
    })
    .select("id")
    .single();
  if (invErr) throw new Error(`inventory insert: ${invErr.message}`);

  // Appointment in the future (so soft-delete protections + overlap apply)
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .insert({
      shop_id: shopId,
      client_id: client.id,
      service_id: svc.id,
      staff_id: staffRecordIds.staff,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    .select("id")
    .single();
  if (apptErr) throw new Error(`appointment insert: ${apptErr.message}`);

  return {
    shopId,
    slug,
    staffRecordIds,
    clientId: client.id,
    serviceId: svc.id,
    inventoryId: inv.id,
    appointmentId: appt.id,
    users: {
      admin: { email: adminEmail, password, userId: adminId, role: "admin" },
      manager: { email: managerEmail, password, userId: managerId, role: "manager" },
      staff: { email: staffEmail, password, userId: staffId, role: "staff" },
    },
  };
}

export async function seedWorld(): Promise<SeededWorld> {
  const admin = adminClient();
  const shopA = await seedShop(admin, "A");
  const shopB = await seedShop(admin, "B");
  return { admin, shopA, shopB };
}

export async function teardownWorld(world: SeededWorld): Promise<void> {
  const { admin, shopA, shopB } = world;

  // Deleting the shop cascades to all child rows via the FKs added in the
  // referential-integrity migration.
  await admin.from("shops").delete().in("id", [shopA.shopId, shopB.shopId]);

  const allUserIds = [
    ...Object.values(shopA.users).map((u) => u.userId),
    ...Object.values(shopB.users).map((u) => u.userId),
  ];
  await Promise.all(
    allUserIds.map((id) => admin.auth.admin.deleteUser(id).catch(() => null)),
  );
}
