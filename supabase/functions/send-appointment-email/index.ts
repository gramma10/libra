import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Deployed with verify_jwt = false, so the caller is authenticated here.
 * The anon key is public and carries no `sub`, so it is not accepted.
 */
async function resolveCallerUserId(
  supabaseUrl: string,
  anonKey: string,
  token: string,
): Promise<string | null> {
  if (!supabaseUrl || !anonKey || !token) return null;
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const { data } = await caller.auth.getClaims(token);
    if (data?.claims?.sub) return data.claims.sub as string;
  } catch {
    // getClaims not available in this client build — fall through to getUser.
  }

  try {
    const { data } = await caller.auth.getUser(token);
    if (data?.user?.id) return data.user.id;
  } catch {
    // ignore
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  const bearer = (req.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!bearer) return json({ error: "Unauthorized" }, 401);

  const isInternal = !!serviceRoleKey && bearer === serviceRoleKey;
  let callerUserId: string | null = null;
  if (!isInternal) {
    callerUserId = await resolveCallerUserId(supabaseUrl, anonKey, bearer);
    if (!callerUserId) return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const appointmentId: string | null =
      body?.appointment_id ?? body?.record?.id ?? null;

    if (!appointmentId) {
      console.warn("No appointment id in payload");
      return json({ ok: true, skipped: "no_appointment_id" });
    }

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return json({ error: "RESEND_API_KEY not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Never trust ids supplied by the caller: re-read the appointment with the
    // service role and derive shop_id / client_id from the database row. This
    // is what stops a signed-in user of shop A from emailing shop B's clients.
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, client_id, shop_id, staff_id, service_id, start_time, end_time")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!appointment) {
      console.warn(`Appointment ${appointmentId} not found`);
      return json({ ok: true, skipped: "appointment_not_found" });
    }

    const { client_id, shop_id, staff_id, service_id, start_time, end_time } =
      appointment as any;

    if (!isInternal) {
      const { data: membership } = await supabase
        .from("shop_members")
        .select("user_id")
        .eq("user_id", callerUserId)
        .eq("shop_id", shop_id)
        .maybeSingle();

      if (!membership) {
        return json({ error: "Forbidden" }, 403);
      }
    }

    const [clientRes, shopRes, staffRes, serviceRes, settingsRes] =
      await Promise.all([
        supabase.from("clients").select("email, first_name, last_name").eq("id", client_id).single(),
        supabase.from("shops").select("name, address, theme_settings").eq("id", shop_id).single(),
        staff_id
          ? supabase.from("staff").select("first_name, last_name").eq("id", staff_id).single()
          : Promise.resolve({ data: null }),
        service_id
          ? supabase.from("services").select("service_name, duration, price").eq("id", service_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("business_settings").select("logo_url, shop_name").eq("shop_id", shop_id).single(),
      ]);

    const client = clientRes.data;
    const shop = shopRes.data;
    const staff = staffRes.data;
    const service = serviceRes.data;
    const settings = settingsRes.data;

    if (!client?.email || !client.email.includes("@")) {
      console.warn(`Client ${client_id} has no valid email, skipping.`);
      return new Response(
        JSON.stringify({ ok: true, skipped: "no_client_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopName = settings?.shop_name || shop?.name || "Our Salon";
    const logoUrl = settings?.logo_url || "";
    const shopAddress = shop?.address || "";
    const themeSettings = (shop?.theme_settings || {}) as Record<string, string>;
    const primaryColor = themeSettings.primary_color || "#000000";
    const clientName = `${client.first_name} ${client.last_name}`.trim();
    const staffName = staff ? `${staff.first_name} ${staff.last_name}`.trim() : "Any available";
    const serviceName = service?.service_name || "Appointment";
    const serviceDuration = service?.duration || 30;

    const localTimeZone = "Europe/Athens";

    const startDate = new Date(start_time);
    const endDate = end_time
      ? new Date(end_time)
      : new Date(startDate.getTime() + serviceDuration * 60_000);

    const dateStr = new Intl.DateTimeFormat("en-US", {
      timeZone: localTimeZone,
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }).format(startDate);

    const timeStr = new Intl.DateTimeFormat("en-US", {
      timeZone: localTimeZone,
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(startDate);

    // Format Google Calendar dates in local timezone
    const pad = (n: number) => String(n).padStart(2, "0");
    const toLocalGcal = (d: Date) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: localTimeZone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }).formatToParts(d);
      const get = (type: string) => parts.find(p => p.type === type)?.value || "00";
      return `${get("year")}${get("month")}${get("day")}T${get("hour")}${get("minute")}${get("second")}`;
    };
    const gcalStart = toLocalGcal(startDate);
    const gcalEnd = toLocalGcal(endDate);
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${serviceName} at ${shopName}`
    )}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(
      `Stylist: ${staffName}`
    )}&location=${encodeURIComponent(shopAddress)}`;

    const mapsUrl = shopAddress
      ? `https://maps.google.com/?q=${encodeURIComponent(shopAddress)}`
      : "";

    const html = buildEmailHtml({
      shopName, logoUrl, primaryColor, clientName, serviceName,
      staffName, dateStr, timeStr, serviceDuration, gcalUrl, mapsUrl, shopAddress,
    });

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${shopName} <noreply@auragram.gr>`,
        to: [client.email],
        subject: `Appointment Confirmed: ${shopName}`,
        html,
      }),
    });

    const resendBody = await resendRes.text();

    if (!resendRes.ok) {
      console.error("Resend API error:", resendRes.status, resendBody);
      return new Response(
        JSON.stringify({ error: "Email send failed", details: resendBody }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully to", client.email);
    return new Response(
      JSON.stringify({ ok: true, sent_to: client.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Email template builder ---

function buildEmailHtml(p: {
  shopName: string; logoUrl: string; primaryColor: string; clientName: string;
  serviceName: string; staffName: string; dateStr: string; timeStr: string;
  serviceDuration: number; gcalUrl: string; mapsUrl: string; shopAddress: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Appointment Confirmed</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 32px 16px;text-align:center;background:linear-gradient(135deg, ${p.primaryColor}11, ${p.primaryColor}08);">
          ${p.logoUrl ? `<img src="${p.logoUrl}" alt="${p.shopName}" style="max-height:60px;max-width:200px;margin-bottom:12px;display:inline-block;" /><br/>` : ""}
          <h2 style="margin:0;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">${p.shopName}</h2>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;text-align:center;">
          <div style="display:inline-block;background-color:${p.primaryColor}14;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">✓</div>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Appointment Confirmed!</h1>
          <p style="margin:0;font-size:15px;color:#71717a;line-height:1.5;">Hi <strong style="color:#18181b;">${p.clientName}</strong>, your appointment has been booked successfully.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:12px;border:1px solid #f0f0f0;">
            <tr><td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detailRow("Service", p.serviceName, true)}${sep()}${detailRow("Stylist", p.staffName)}${sep()}${detailRow("Date", p.dateStr)}${sep()}${detailRow("Time", p.timeStr)}${sep()}${detailRow("Duration", `${p.serviceDuration} min`)}
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:4px 32px 12px;text-align:center;">
          <a href="${p.gcalUrl}" target="_blank" style="display:inline-block;background-color:${p.primaryColor};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;">📅&nbsp; Add to Google Calendar</a>
        </td></tr>
        ${p.mapsUrl ? `<tr><td style="padding:0 32px 24px;text-align:center;"><a href="${p.mapsUrl}" target="_blank" style="display:inline-block;background-color:#f4f4f5;color:#18181b;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500;">📍&nbsp; View Location</a></td></tr>` : ""}
        <tr><td style="padding:20px 32px 28px;text-align:center;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">Need to reschedule? Contact us directly.<br/>© ${new Date().getFullYear()} ${p.shopName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function detailRow(label: string, value: string, bold = false) {
  return `<tr><td style="padding:6px 0;font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${label}</td><td style="padding:6px 0;font-size:15px;color:#18181b;text-align:right;${bold ? "font-weight:600;" : ""}">${value}</td></tr>`;
}

function sep() {
  return `<tr><td colspan="2" style="border-bottom:1px solid #f0f0f0;padding:0;height:1px;"></td></tr>`;
}
