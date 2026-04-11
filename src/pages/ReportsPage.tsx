import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, UserX, TrendingDown, Loader2, Wallet, CalendarDays, CalendarRange } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ReportsCalendar from "@/components/reports/ReportsCalendar";
import StatCard from "@/components/reports/StatCard";
import RevenuePieChart from "@/components/reports/RevenuePieChart";
import { useRole } from "@/hooks/useRole";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";

const formatCurrency = (v: number) => `€${v.toFixed(0)}`;

interface Appointment {
  id: string; start_time: string; end_time: string; status: string; is_paid: boolean;
  service_id: string | null; staff_id: string | null;
  services?: { price: number; service_name: string } | null;
}
interface StaffMember { id: string; commission_rate: number; }
interface ProductSale { total_amount: number; sale_date: string; inventory_id: string; inventory?: { product_name: string } | null; }
interface Expense { amount: number; category: string; }

const isRevenueEligible = (a: Appointment, now: Date) =>
  a.status !== "Cancelled" && a.status !== "No-Show" && new Date(a.end_time) <= now;

const sumRevenue = (appts: Appointment[], now: Date) =>
  appts.filter((a) => isRevenueEligible(a, now)).reduce((s, a) => s + Number(a.services?.price || 0), 0);

type ViewMode = "month" | "year";

export default function ReportsPage() {
  const { isAdmin } = useRole();
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
  const [staffMap, setStaffMap] = useState<Record<string, number>>({});
  const [productSales, setProductSales] = useState<ProductSale[]>([]);

  const now = useMemo(() => new Date(), []);
  const monthLabel = (d: Date) => d.toLocaleString(locale, { month: "long", year: "numeric" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    let start: Date, end: Date;
    if (viewMode === "year") {
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    }

    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    const [apptRes, expRes, staffRes, salesRes] = await Promise.all([
      supabase.from("appointments").select("id, start_time, end_time, status, is_paid, service_id, staff_id, services(price, service_name)").gte("start_time", start.toISOString()).lte("start_time", end.toISOString()).order("start_time"),
      supabase.from("expenses").select("amount, category").gte("date", startDate).lte("date", endDate),
      supabase.from("staff").select("id, commission_rate"),
      supabase.from("product_sales").select("total_amount, sale_date, inventory_id, inventory(product_name)").gte("sale_date", startDate).lte("sale_date", endDate),
    ]);
    setAppointments((apptRes.data as Appointment[]) || []);
    const expenses = (expRes.data as Expense[]) || [];
    setMonthExpenses(expenses.reduce((s, e) => s + Number(e.amount), 0));
    const catMap: Record<string, number> = {};
    expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });
    setExpensesByCategory(catMap);
    const map: Record<string, number> = {};
    ((staffRes.data as StaffMember[]) || []).forEach((s) => { map[s.id] = Number(s.commission_rate); });
    setStaffMap(map);
    setProductSales((salesRes.data as ProductSale[]) || []);
    setLoading(false);
  }, [viewDate, viewMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigate = (dir: number) => {
    const d = new Date(viewDate);
    if (viewMode === "year") {
      d.setFullYear(d.getFullYear() + dir);
    } else {
      d.setMonth(d.getMonth() + dir);
    }
    setViewDate(d);
  };

  const serviceRevenue = sumRevenue(appointments, now);
  const productRevenue = productSales.reduce((s, p) => s + Number(p.total_amount), 0);
  const totalRevenue = serviceRevenue + productRevenue;
  const totalAppts = appointments.filter((a) => a.status !== "Cancelled").length;
  const totalNoShows = appointments.filter((a) => a.status === "No-Show").length;

  const totalCommissions = useMemo(() => {
    return appointments.filter((a) => isRevenueEligible(a, now) && a.staff_id && a.services?.price)
      .reduce((sum, a) => { const rate = staffMap[a.staff_id!] || 0; return sum + (Number(a.services!.price) * rate / 100); }, 0);
  }, [appointments, staffMap, now]);

  const totalExpensesAmount = monthExpenses + totalCommissions;
  const netProfit = totalRevenue - totalExpensesAmount;

  const weekStart = useMemo(() => { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d; }, [now]);
  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); d.setHours(23, 59, 59, 999); return d; }, [weekStart]);
  const weekAppts = appointments.filter((a) => { const s = new Date(a.start_time); return s >= weekStart && s <= weekEnd; });
  const weekRevenue = sumRevenue(weekAppts, now);
  const weekApptCount = weekAppts.filter((a) => a.status !== "Cancelled").length;

  const dailyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => { if (!isRevenueEligible(a, now)) return; const key = new Date(a.start_time).toDateString(); map[key] = (map[key] || 0) + Number(a.services?.price || 0); });
    productSales.forEach((s) => { const key = new Date(s.sale_date + "T00:00:00").toDateString(); map[key] = (map[key] || 0) + Number(s.total_amount); });
    return map;
  }, [appointments, productSales, now]);

  const dailyCount = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => { if (a.status === "Cancelled") return; const key = new Date(a.start_time).toDateString(); map[key] = (map[key] || 0) + 1; });
    return map;
  }, [appointments]);

  // Monthly breakdown chart data for year view
  const chartData = useMemo(() => {
    if (viewMode === "year") {
      const months: { name: string; [key: string]: string | number }[] = [];
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(viewDate.getFullYear(), m, 1);
        const mEnd = new Date(viewDate.getFullYear(), m + 1, 0, 23, 59, 59, 999);
        const mAppts = appointments.filter(a => {
          const d = new Date(a.start_time);
          return d >= mStart && d <= mEnd;
        });
        const mSales = productSales.filter(s => {
          const d = new Date(s.sale_date + "T00:00:00");
          return d >= mStart && d <= mEnd;
        });
        const mServiceRev = sumRevenue(mAppts, now);
        const mProductRev = mSales.reduce((s, p) => s + Number(p.total_amount), 0);
        const mRev = mServiceRev + mProductRev;

        const mExpenses = appointments.filter(a => isRevenueEligible(a, now) && a.staff_id && a.services?.price && new Date(a.start_time) >= mStart && new Date(a.start_time) <= mEnd)
          .reduce((sum, a) => sum + (Number(a.services!.price) * (staffMap[a.staff_id!] || 0) / 100), 0);

        const label = mStart.toLocaleString(locale, { month: "short" });
        months.push({
          name: label,
          [t("reports.revenue")]: mRev,
          [t("reports.expensesLabel")]: mExpenses,
        });
      }
      return months;
    }
    const d = new Date(viewDate);
    return [{ name: d.toLocaleString(locale, { month: "long" }).split(" ")[0], [t("reports.revenue")]: totalRevenue, [t("reports.expensesLabel")]: totalExpensesAmount }];
  }, [viewMode, viewDate, appointments, productSales, totalRevenue, totalExpensesAmount, staffMap, now, t, locale]);

  const revenuePieData = useMemo(() => {
    const serviceMap: Record<string, number> = {};
    appointments.filter((a) => isRevenueEligible(a, now)).forEach((a) => {
      const name = a.services?.service_name || "Other Service";
      serviceMap[name] = (serviceMap[name] || 0) + Number(a.services?.price || 0);
    });
    const entries = Object.entries(serviceMap).map(([name, value]) => ({ name, value }));
    if (productRevenue > 0) entries.push({ name: t("reports.products"), value: productRevenue });
    return entries;
  }, [appointments, productRevenue, now, t]);

  const expensesPieData = useMemo(() => {
    const entries: { name: string; value: number }[] = [];
    ["Rent", "Electricity", "Water", "Marketing", "Salaries", "Other"].forEach((cat) => {
      const val = expensesByCategory[cat] || 0;
      if (val > 0) entries.push({ name: cat, value: val });
    });
    const inventoryCost = expensesByCategory["Products"] || 0;
    if (inventoryCost > 0) entries.push({ name: "Inventory Costs", value: inventoryCost });
    if (totalCommissions > 0) entries.push({ name: t("reports.commissions"), value: totalCommissions });
    return entries;
  }, [expensesByCategory, totalCommissions, t]);

  const revenueLabel = viewMode === "year" ? t("reports.yearRevenue") : t("reports.monthRevenue");
  const expensesLabel = viewMode === "year" ? t("reports.yearExpenses") : t("reports.totalExpenses");
  const profitLabel = viewMode === "year" ? t("reports.yearProfit") : t("reports.netProfit");
  const noShowLabel = viewMode === "year" ? t("reports.yearNoShows") : t("reports.noShowsLabel");

  const stats = [
    { label: revenueLabel, value: formatCurrency(totalRevenue), icon: DollarSign, color: "hsl(var(--success))", subtitle: `${t("reports.services")}: €${serviceRevenue.toFixed(0)} · ${t("reports.products")}: €${productRevenue.toFixed(0)}` },
    ...(isAdmin ? [
      { label: expensesLabel, value: formatCurrency(totalExpensesAmount), icon: TrendingDown, color: "hsl(var(--destructive))", subtitle: `${t("reports.manual")}: €${monthExpenses.toFixed(0)} · ${t("reports.commissions")}: €${totalCommissions.toFixed(0)}` },
      { label: profitLabel, value: formatCurrency(netProfit), icon: Wallet, color: netProfit >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))", highlight: true, positive: netProfit >= 0 },
    ] : []),
    { label: noShowLabel, value: String(totalNoShows), icon: UserX, color: "hsl(var(--destructive))" },
  ];

  const periodLabel = viewMode === "year"
    ? String(viewDate.getFullYear())
    : monthLabel(viewDate);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("reports.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs gap-1.5"
            onClick={() => setViewMode("month")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {t("reports.monthly")}
          </Button>
          <Button
            variant={viewMode === "year" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs gap-1.5"
            onClick={() => setViewMode("year")}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            {t("reports.yearly")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (<StatCard key={stat.label} stat={stat} index={i} />))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-apple flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {viewMode === "month" && (
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("reports.thisWeek")}</p>
            <p className="text-lg font-semibold mt-0.5">{formatCurrency(weekRevenue)} <span className="text-sm font-normal text-muted-foreground">· {weekApptCount} {t("reports.appointmentsLabel")}</span></p>
          </div>
        )}
        <div className={viewMode === "year" ? "" : "sm:text-right"}>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{periodLabel}</p>
          <p className="text-lg font-semibold mt-0.5">{formatCurrency(totalRevenue)} <span className="text-sm font-normal text-muted-foreground">· {totalAppts} {t("reports.apptsLabel")}</span></p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-apple">
        <h3 className="text-sm font-semibold mb-4">
          {viewMode === "year" ? t("reports.monthlyBreakdown") : t("reports.revenueVsExpenses")}
        </h3>
        <ResponsiveContainer width="100%" height={viewMode === "year" ? 300 : 220}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `€${v}`} />
            <Tooltip formatter={(v: number) => `€${v.toFixed(0)}`} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            <Legend />
            <Bar dataKey={t("reports.revenue")} fill="hsl(145 63% 42%)" radius={[6, 6, 0, 0]} />
            <Bar dataKey={t("reports.expensesLabel")} fill="hsl(0 72% 51%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RevenuePieChart data={revenuePieData} title={t("reports.revenueBreakdown")} />
          <RevenuePieChart data={expensesPieData} title={t("reports.expensesBreakdown")} />
        </div>
      )}

      {viewMode === "month" && (
        <ReportsCalendar viewDate={viewDate} onNavigate={navigate} dailyRevenue={dailyRevenue} dailyCount={dailyCount} now={now} />
      )}
    </motion.div>
  );
}
