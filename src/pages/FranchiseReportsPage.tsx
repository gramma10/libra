import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CalendarDays, CalendarRange, DollarSign, Loader2, TrendingDown, UserX, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/reports/StatCard";
import RevenuePieChart from "@/components/reports/RevenuePieChart";
import PerShopRevenueChart from "@/components/reports/PerShopRevenueChart";
import DailyAISummary from "@/components/reports/DailyAISummary";
import { Button } from "@/components/ui/button";
import { useShop } from "@/hooks/useShop";
import { useLanguage } from "@/hooks/useLanguage";
import {
  computeCommissions,
  expensesByCategoryMap,
  formatCurrency,
  isRevenueEligible,
  staffCommissionMap,
  sumProductRevenue,
  sumRevenue,
  type ReportAppointment,
  type ReportExpense,
  type ReportProductSale,
  type ReportStaff,
} from "@/lib/reports/aggregate";

type ViewMode = "month" | "year";

export default function FranchiseReportsPage() {
  const { adminShops, activeShopIds } = useShop();
  const { t, locale } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [appointments, setAppointments] = useState<ReportAppointment[]>([]);
  const [expenses, setExpenses] = useState<ReportExpense[]>([]);
  const [staff, setStaff] = useState<ReportStaff[]>([]);
  const [productSales, setProductSales] = useState<ReportProductSale[]>([]);

  const now = useMemo(() => new Date(), []);

  const fetchData = useCallback(async () => {
    if (activeShopIds.length === 0) {
      setAppointments([]); setExpenses([]); setStaff([]); setProductSales([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const start = viewMode === "year" ? new Date(year, 0, 1) : new Date(year, month, 1);
    const end = viewMode === "year"
      ? new Date(year, 11, 31, 23, 59, 59, 999)
      : new Date(year, month + 1, 0, 23, 59, 59, 999);
    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    const [apptRes, expRes, staffRes, salesRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, start_time, end_time, status, is_paid, service_id, staff_id, shop_id, services!appointments_service_id_fkey(price, service_name)")
        .in("shop_id", activeShopIds)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time"),
      supabase
        .from("expenses")
        .select("amount, category, shop_id")
        .in("shop_id", activeShopIds)
        .gte("date", startDate)
        .lte("date", endDate),
      supabase
        .from("staff")
        .select("id, commission_rate, shop_id")
        .in("shop_id", activeShopIds),
      supabase
        .from("product_sales")
        .select("total_amount, sale_date, inventory_id, shop_id")
        .in("shop_id", activeShopIds)
        .gte("sale_date", startDate)
        .lte("sale_date", endDate),
    ]);
    setAppointments((apptRes.data as ReportAppointment[]) || []);
    setExpenses((expRes.data as ReportExpense[]) || []);
    setStaff((staffRes.data as ReportStaff[]) || []);
    setProductSales((salesRes.data as ReportProductSale[]) || []);
    setLoading(false);
  }, [viewDate, viewMode, activeShopIds]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigate = (dir: number) => {
    const d = new Date(viewDate);
    if (viewMode === "year") d.setFullYear(d.getFullYear() + dir);
    else d.setMonth(d.getMonth() + dir);
    setViewDate(d);
  };

  const staffMap = useMemo(() => staffCommissionMap(staff), [staff]);
  const expensesByCategory = useMemo(() => expensesByCategoryMap(expenses), [expenses]);
  const monthExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const serviceRevenue = sumRevenue(appointments, now);
  const productRevenue = sumProductRevenue(productSales);
  const totalRevenue = serviceRevenue + productRevenue;
  const totalAppts = appointments.filter((a) => a.status !== "Cancelled").length;
  const totalNoShows = appointments.filter((a) => a.status === "No-Show").length;
  const totalCommissions = useMemo(
    () => computeCommissions(appointments, staffMap, now),
    [appointments, staffMap, now],
  );
  const totalExpensesAmount = monthExpenses + totalCommissions;
  const netProfit = totalRevenue - totalExpensesAmount;

  // Aggregated revenue/expenses bar chart (same shape as single-shop)
  const chartData = useMemo(() => {
    if (viewMode === "year") {
      const months: { name: string; [key: string]: string | number }[] = [];
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(viewDate.getFullYear(), m, 1);
        const mEnd = new Date(viewDate.getFullYear(), m + 1, 0, 23, 59, 59, 999);
        const mAppts = appointments.filter((a) => {
          const d = new Date(a.start_time);
          return d >= mStart && d <= mEnd;
        });
        const mSales = productSales.filter((s) => {
          const d = new Date(s.sale_date + "T00:00:00");
          return d >= mStart && d <= mEnd;
        });
        const mServiceRev = sumRevenue(mAppts, now);
        const mProductRev = sumProductRevenue(mSales);
        const mRev = mServiceRev + mProductRev;
        const mCommissions = computeCommissions(mAppts, staffMap, now);
        const label = mStart.toLocaleString(locale, { month: "short" });
        months.push({
          name: label,
          [t("reports.revenue")]: mRev,
          [t("reports.expensesLabel")]: mCommissions,
        });
      }
      return months;
    }
    return [
      {
        name: viewDate.toLocaleString(locale, { month: "long" }).split(" ")[0],
        [t("reports.revenue")]: totalRevenue,
        [t("reports.expensesLabel")]: totalExpensesAmount,
      },
    ];
  }, [viewMode, viewDate, appointments, productSales, staffMap, now, t, locale, totalRevenue, totalExpensesAmount]);

  // Per-shop comparison chart — one numeric series per shop, keyed by shop name.
  const perShopData = useMemo(() => {
    if (adminShops.length === 0) return [];

    const buildEntry = (mAppts: ReportAppointment[], mSales: ReportProductSale[], label: string) => {
      const entry: { name: string } & Record<string, string | number> = { name: label };
      for (const shop of adminShops) {
        const shopAppts = mAppts.filter((a) => a.shop_id === shop.id);
        const shopSales = mSales.filter((s) => s.shop_id === shop.id);
        entry[shop.name] = sumRevenue(shopAppts, now) + sumProductRevenue(shopSales);
      }
      return entry;
    };

    if (viewMode === "year") {
      const rows = [];
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(viewDate.getFullYear(), m, 1);
        const mEnd = new Date(viewDate.getFullYear(), m + 1, 0, 23, 59, 59, 999);
        const mAppts = appointments.filter((a) => {
          const d = new Date(a.start_time);
          return d >= mStart && d <= mEnd;
        });
        const mSales = productSales.filter((s) => {
          const d = new Date(s.sale_date + "T00:00:00");
          return d >= mStart && d <= mEnd;
        });
        rows.push(buildEntry(mAppts, mSales, mStart.toLocaleString(locale, { month: "short" })));
      }
      return rows;
    }

    return [buildEntry(appointments, productSales, viewDate.toLocaleString(locale, { month: "long" }).split(" ")[0])];
  }, [viewMode, viewDate, appointments, productSales, adminShops, now, locale]);

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
    {
      label: revenueLabel, value: formatCurrency(totalRevenue), icon: DollarSign, color: "hsl(var(--success))",
      subtitle: `${t("reports.services")}: €${serviceRevenue.toFixed(0)} · ${t("reports.products")}: €${productRevenue.toFixed(0)}`,
    },
    {
      label: expensesLabel, value: formatCurrency(totalExpensesAmount), icon: TrendingDown, color: "hsl(var(--destructive))",
      subtitle: `${t("reports.manual")}: €${monthExpenses.toFixed(0)} · ${t("reports.commissions")}: €${totalCommissions.toFixed(0)}`,
    },
    {
      label: profitLabel, value: formatCurrency(netProfit), icon: Wallet,
      color: netProfit >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))",
      highlight: true, positive: netProfit >= 0,
    },
    { label: noShowLabel, value: String(totalNoShows), icon: UserX, color: "hsl(var(--destructive))" },
  ];

  const monthLabel = viewDate.toLocaleString(locale, { month: "long", year: "numeric" });
  const periodLabel = viewMode === "year" ? String(viewDate.getFullYear()) : monthLabel;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("franchise.franchiseOverview")} · {adminShops.length} {t("franchise.shop").toLowerCase()}s
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>‹</Button>
            <span className="text-xs text-muted-foreground px-2">{periodLabel}</span>
            <Button variant="ghost" size="sm" onClick={() => navigate(1)}>›</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (<StatCard key={stat.label} stat={stat} index={i} />))}
      </div>

      <DailyAISummary />

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

      <PerShopRevenueChart data={perShopData} shops={adminShops.map((s) => ({ id: s.id, name: s.name }))} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenuePieChart data={revenuePieData} title={t("reports.revenueBreakdown")} />
        <RevenuePieChart data={expensesPieData} title={t("reports.expensesBreakdown")} />
      </div>
    </motion.div>
  );
}
