import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload?.record;

    if (!record) {
      console.warn("No record in payload");
      return new Response(JSON.stringify({ ok: true, skipped: "no_record" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id, shop_id, staff_id, service_id, start_time, end_time } =
      record;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all related data in parallel
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

    // Early exit if no client email
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
    const staffName = staff
      ? `${staff.first_name} ${staff.last_name}`.trim()
      : "Any available";
    const serviceName = service?.service_name || "Appointment";
    const serviceDuration = service?.duration || 30;

    // Format dates
    const startDate = new Date(start_time);
    const endDate = end_time
      ? new Date(end_time)
      : new Date(startDate.getTime() + serviceDuration * 60_000);

    const dateStr = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = startDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Google Calendar link
    const gcalStart = startDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const gcalEnd = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${serviceName} at ${shopName}`
    )}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(
      `Stylist: ${staffName}`
    )}&location=${encodeURIComponent(shopAddress)}`;

    const mapsUrl = shopAddress
      ? `https://maps.google.com/?q=${encodeURIComponent(shopAddress)}`
      : "";

    // Build premium HTML email
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- Header with logo -->
          <tr>
            <td style="padding:32px 32px 16px;text-align:center;background:linear-gradient(135deg, ${primaryColor}11, ${primaryColor}08);">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="${shopName}" style="max-height:60px;max-width:200px;margin-bottom:12px;display:inline-block;" /><br/>`
                  : ""
              }
              <h2 style="margin:0;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">${shopName}</h2>
            </td>
          </tr>

          <!-- Confirmation message -->
          <tr>
            <td style="padding:24px 32px 8px;text-align:center;">
              <div style="display:inline-block;background-color:${primaryColor}14;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">✓</div>
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Appointment Confirmed!</h1>
              <p style="margin:0;font-size:15px;color:#71717a;line-height:1.5;">
                Hi <strong style="color:#18181b;">${clientName}</strong>, your appointment has been booked successfully.
              </p>
            </td>
          </tr>

          <!-- Details card -->
          <tr>
            <td style="padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:12px;border:1px solid #f0f0f0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Service</td>
                        <td style="padding:6px 0;font-size:15px;color:#18181b;text-align:right;font-weight:600;">${serviceName}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-bottom:1px solid #f0f0f0;padding:0;height:1px;"></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Stylist</td>
                        <td style="padding:6px 0;font-size:15px;color:#18181b;text-align:right;">${staffName}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-bottom:1px solid #f0f0f0;padding:0;height:1px;"></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Date</td>
                        <td style="padding:6px 0;font-size:15px;color:#18181b;text-align:right;">${dateStr}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-bottom:1px solid #f0f0f0;padding:0;height:1px;"></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Time</td>
                        <td style="padding:6px 0;font-size:15px;color:#18181b;text-align:right;">${timeStr}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-bottom:1px solid #f0f0f0;padding:0;height:1px;"></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Duration</td>
                        <td style="padding:6px 0;font-size:15px;color:#18181b;text-align:right;">${serviceDuration} min</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding:4px 32px 12px;text-align:center;">
              <a href="${gcalUrl}" target="_blank" style="display:inline-block;background-color:${primaryColor};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                📅&nbsp; Add to Google Calendar
              </a>
            </td>
          </tr>
          ${
            mapsUrl
              ? `<tr>
            <td style="padding:0 32px 24px;text-align:center;">
              <a href="${mapsUrl}" target="_blank" style="display:inline-block;background-color:#f4f4f5;color:#18181b;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500;">
                📍&nbsp; View Location
              </a>
            </td>
          </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                Need to reschedule? Contact us directly.<br/>
                © ${new Date().getFullYear()} ${shopName}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${shopName} <onboarding@resend.dev>`,
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
