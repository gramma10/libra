import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TZ = "Europe/Athens";

type Period = "day" | "week" | "month";

function rangeBoundsISO(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00+02:00`);
  const end = new Date(`${endDate}T23:59:59.999+02:00`);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00+02:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function diffDays(startDate: string, endDate: string) {
  const a = new Date(`${startDate}T12:00:00+02:00`).getTime();
  const b = new Date(`${endDate}T12:00:00+02:00`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

// Compute period range from anchor date
function computeRange(anchor: string, period: Period): { start: string; end: string } {
  if (period === "day") return { start: anchor, end: anchor };
  const d = new Date(`${anchor}T12:00:00+02:00`);
  if (period === "week") {
    // ISO week: Monday-Sunday
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() - dow);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return {
      start: start.toLocaleDateString("en-CA", { timeZone: TZ }),
      end: end.toLocaleDateString("en-CA", { timeZone: TZ }),
    };
  }
  // month
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 12));
  const end = new Date(Date.UTC(y, m + 1, 0, 12));
  return {
    start: start.toLocaleDateString("en-CA", { timeZone: TZ }),
    end: end.toLocaleDateString("en-CA", { timeZone: TZ }),
  };
}

// Previous comparable range
function previousRange(start: string, end: string): { start: string; end: string } {
  const len = diffDays(start, end);
  return { start: shiftDate(start, -len), end: shiftDate(end, -len) };
}

interface RangeStats {
  start: string;
  end: string;
  days: number;
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

async function getRangeStats(
  supabase: ReturnType<typeof createClient>,
  shopId: string,
  startDate: string,
  endDate: string,
): Promise<RangeStats> {
  const { startISO, endISO } = rangeBoundsISO(startDate, endDate);

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
      .gte("sale_date", startDate)
      .lte("sale_date", endDate),
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
    start: startDate,
    end: endDate,
    days: diffDays(startDate, endDate),
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
    const anchor: string =
      body.date ||
      new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const period: Period =
      body.period === "week" || body.period === "month" ? body.period : "day";
    const language: string = body.language === "el" ? "el" : "en";

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
    const current = computeRange(anchor, period);
    const previous = previousRange(current.start, current.end);

    const [currentStats, previousStats] = await Promise.all([
      getRangeStats(supabase, shopId, current.start, current.end),
      getRangeStats(supabase, shopId, previous.start, previous.end),
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

    const periodLabel =
      period === "day" ? "day" : period === "week" ? "week" : "month";
    const wordCap = period === "day" ? 140 : 200;

    const systemPrompt = `You are a salon business analytics assistant. Given the current ${periodLabel}'s and the previous comparable ${periodLabel}'s data, write a SHORT revenue summary (max ${wordCap} words) for the salon owner.

Structure your reply as 3 short sections with markdown:
**📊 Revenue snapshot** — total revenue this ${periodLabel} vs the previous ${periodLabel} with % change, and explicitly call out the cash vs card split and how it shifted.
**🔑 Key drivers** — 1-3 sentences explaining what drove the change (top services, product sales, no-shows, completed appointments). For week/month, mention trends across days if relevant.
**🏆 Top staff** — name the top performer(s) by revenue and how they compare.

If the period has zero data, say so plainly and skip drivers. Use € for currency. ${langInstruction}`;

    const userContent = `Period: ${periodLabel}
Current (${currentStats.start} → ${currentStats.end}): ${JSON.stringify(currentStats)}
Previous (${previousStats.start} → ${previousStats.end}): ${JSON.stringify(previousStats)}`;

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
      JSON.stringify({
        summary,
        period,
        range: current,
        previousRange: previous,
        current: currentStats,
        previous: previousStats,
      }),
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
