import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = authHeader.replace("Bearer ", "");

    // Client with caller's JWT to verify identity & role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Use getClaims to verify JWT without requiring an active session
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub;

    const body = await req.json();
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      role,
      commission_rate,
      shop_id: bodyShopId,
    } = body;

    // Resolve target shop. For multi-shop admins the client must specify shop_id;
    // for single-shop admins we allow falling back to their only membership.
    let shopId: string | null = bodyShopId ?? null;
    if (!shopId) {
      const { data: memberships } = await callerClient
        .from("shop_members")
        .select("shop_id")
        .eq("user_id", callerUserId)
        .eq("role", "admin");
      if (!memberships || memberships.length === 0) {
        return new Response(JSON.stringify({ error: "No shop found for admin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (memberships.length > 1) {
        return new Response(JSON.stringify({ error: "shop_id is required when admin of multiple shops" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      shopId = memberships[0].shop_id;
    }

    // Verify caller is an admin of the target shop.
    const { data: isAdminRow } = await callerClient
      .from("shop_members")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("shop_id", shopId)
      .maybeSingle();
    if (!isAdminRow || isAdminRow.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins of this shop can create staff accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role to create user without affecting session
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "This email is already in use." }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create the auth user with email confirmed and metadata flag
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          requires_password_change: true,
          first_name,
          last_name,
        },
      });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;

    // Insert into shop_members
    const { error: memberError } = await adminClient
      .from("shop_members")
      .insert({ user_id: newUserId, shop_id: shopId, role: "staff" });

    if (memberError) {
      // Cleanup: delete the auth user if membership insert fails
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into staff table
    const { error: staffError } = await adminClient.from("staff").insert({
      shop_id: shopId,
      user_id: newUserId,
      first_name,
      last_name,
      phone: phone || "",
      email,
      role: role || "Stylist",
      commission_rate: commission_rate || 0,
      is_active: true,
    });

    if (staffError) {
      // Cleanup
      await adminClient.from("shop_members").delete().eq("user_id", newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: staffError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
