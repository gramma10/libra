import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TZ = "Europe/Athens";

function dayBoundsISO(dateStr: string) {
  // dateStr is YYYY-MM-DD interpreted as Europe/Athens day
  // Approx: Athens is UTC+2/+3. We'll use the JS Date parsing with explicit offset via toLocaleString round-trip.
  const start = new Date(`${dateStr}T00:00:00+02:00`);
  const end = new Date(`${dateStr}T23:59:59.999+02:00`);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00+02:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

interface DayStats {
  date: string;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  appointmentCount: number;
  completedCount: number;
  noShowCount: number;
  productSales: number;
  staffPerformance: { name: string; revenue: number; count: number }[];
  topServices: { name: string; revenue: number; count: number }[];
}

async function getDayStats(
  supabase: ReturnType<typeof createClient>,
  shopId: string,
  dateStr: string,
): Promise<DayStats> {
  const { startISO, endISO } = dayBoundsISO(dateStr);

  const [apptRes, txRes, salesRes, staffRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, status, staff_id, service_id, services(price, service_name)",
      )
      .eq("shop_id", shopId)
      .gte("start_time", startISO)
      .lte("start_time", endISO),
    supabase
      .from("transactions")
      .select("amount_total, payment_method, appointment_id, created_at")
      .eq("shop_id", shopId)
      .gte("created_at", startISO)
      .lte("created_at", endISO),
    supabase
      .from("product_sales")
      .select("total_amount")
      .eq("shop_id", shopId)
      .eq("sale_date", dateStr),
    supabase.from("staff").select("id, first_name, last_name").eq("shop_id", shopId),
  ]);

  const appointments = (apptRes.data as any[]) || [];
  const transactions = (txRes.data as any[]) || [];
  const productSales = (salesRes.data as any[]) || [];
  const staff = (staffRes.data as any[]) || [];

  const staffNameMap: Record<string, string> = {};
  staff.forEach((s) => {
    staffNameMap[s.id] = `${s.first_name} ${s.last_name}`.trim();
  });

  let cashRevenue = 0;
  let cardRevenue = 0;
  transactions.forEach((t) => {
    const amt = Number(t.amount_total) || 0;
    const m = String(t.payment_method || "").toLowerCase();
    if (m === "cash") cashRevenue += amt;
    else cardRevenue += amt;
  });

  const completed = appointments.filter((a) => a.status === "Completed");
  const noShow = appointments.filter((a) => a.status === "No-Show").length;
  const serviceRevenue = completed.reduce(
    (s, a) => s + Number(a.services?.price || 0),
    0,
  );
  const productRevenue = productSales.reduce(
    (s, p) => s + Number(p.total_amount || 0),
    0,
  );

  const staffStats: Record<string, { revenue: number; count: number }> = {};
  completed.forEach((a) => {
    if (!a.staff_id) return;
    const k = a.staff_id;
    staffStats[k] ||= { revenue: 0, count: 0 };
    staffStats[k].revenue += Number(a.services?.price || 0);
    staffStats[k].count += 1;
  });
  const staffPerformance = Object.entries(staffStats)
    .map(([id, v]) => ({
      name: staffNameMap[id] || "Unknown",
      revenue: v.revenue,
      count: v.count,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const svcStats: Record<string, { revenue: number; count: number }> = {};
  completed.forEach((a) => {
    const name = a.services?.service_name || "Other";
    svcStats[name] ||= { revenue: 0, count: 0 };
    svcStats[name].revenue += Number(a.services?.price || 0);
    svcStats[name].count += 1;
  });
  const topServices = Object.entries(svcStats)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    date: dateStr,
    totalRevenue: serviceRevenue + productRevenue,
    cashRevenue,
    cardRevenue,
    appointmentCount: appointments.filter((a) => a.status !== "Cancelled")
      .length,
    completedCount: completed.length,
    noShowCount: noShow,
    productSales: productRevenue,
    staffPerformance,
    topServices,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const date: string =
      body.date ||
      new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const language: string = body.language === "el" ? "el" : "en";

    // Resolve user's shop
    const { data: member } = await supabase
      .from("shop_members")
      .select("shop_id")
      .eq("user_id", userRes.user.id)
      .maybeSingle();

    if (!member?.shop_id) {
      return new Response(JSON.stringify({ error: "No shop found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopId = member.shop_id as string;
    const prevDate = shiftDate(date, -1);

    const [today, yesterday] = await Promise.all([
      getDayStats(supabase, shopId, date),
      getDayStats(supabase, shopId, prevDate),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const langInstruction =
      language === "el"
        ? "Reply in Greek (Ελληνικά). Use a friendly, concise tone."
        : "Reply in English. Use a friendly, concise tone.";

    const systemPrompt = `You are a salon business analytics assistant. Given today's and yesterday's data, write a SHORT daily revenue summary (max 140 words) for the salon owner.

Structure your reply as 3 short sections with markdown:
**📊 Revenue snapshot** — total revenue today vs yesterday with % change, and explicitly call out the cash vs card split and how it shifted.
**🔑 Key drivers** — 1-2 sentences explaining what drove the change (top services, product sales, no-shows, completed appointments).
**🏆 Top staff** — name the top performer(s) by revenue today and how they compare.

If today has zero data, say so plainly and skip drivers. Use € for currency. ${langInstruction}`;

    const userContent = `Today (${today.date}): ${JSON.stringify(today)}
Yesterday (${yesterday.date}): ${JSON.stringify(yesterday)}`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      },
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit reached, please try again shortly.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in Settings.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const summary: string =
      aiJson.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ summary, today, yesterday }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("daily-revenue-summary error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
