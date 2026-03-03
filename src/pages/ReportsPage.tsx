import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, Calendar, UserX, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ReportsCalendar from "@/components/reports/ReportsCalendar";
import StatCard from "@/components/reports/StatCard";

const formatCurrency = (v: number) => `€${v.toFixed(0)}`;
const monthLabel = (d: Date) => d.toLocaleString("default", { month: "long", year: "numeric" });

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  is_paid: boolean;
  service_id: string | null;
  staff_id: string | null;
  services?: { price: number; service_name: string } | null;
}

interface StaffMember {
  id: string;
  commission_rate: number;
}

const isRevenueEligible = (a: Appointment, now: Date) =>
  a.status !== "Cancelled" && a.status !== "No-Show" && new Date(a.end_time) <= now;

const sumRevenue = (appts: Appointment[], now: Date) =>
  appts.filter((a) => isRevenueEligible(a, now)).reduce((s, a) => s + Number(a.services?.price || 0), 0);

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [staffMap, setStaffMap] = useState<Record<string, number>>({});

  const now = useMemo(() => new Date(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    const [apptRes, expRes, staffRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, start_time, end_time, status, is_paid, service_id, staff_id, services(price, service_name)")
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time"),
      supabase
        .from("expenses")
        .select("amount")
        .gte("date", startDate)
        .lte("date", endDate),
      supabase.from("staff").select("id, commission_rate"),
    ]);

    setAppointments((apptRes.data as Appointment[]) || []);
    setMonthExpenses((expRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0));

    const map: Record<string, number> = {};
    (staffRes.data as StaffMember[] || []).forEach((s) => { map[s.id] = Number(s.commission_rate); });
    setStaffMap(map);

    setLoading(false);
  }, [viewDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigate = (dir: number) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + dir);
    setViewDate(d);
  };

  // --- Stats ---
  const monthRevenue = sumRevenue(appointments, now);
  const monthAppts = appointments.filter((a) => a.status !== "Cancelled").length;
  const monthNoShows = appointments.filter((a) => a.status === "No-Show").length;

  // Automated commissions
  const monthCommissions = useMemo(() => {
    return appointments
      .filter((a) => isRevenueEligible(a, now) && a.staff_id && a.services?.price)
      .reduce((sum, a) => {
        const rate = staffMap[a.staff_id!] || 0;
        return sum + (Number(a.services!.price) * rate / 100);
      }, 0);
  }, [appointments, staffMap, now]);

  const totalExpenses = monthExpenses + monthCommissions;
  const netProfit = monthRevenue - totalExpenses;

  // Week stats
  const weekStart = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);
  const weekAppts = appointments.filter((a) => {
    const s = new Date(a.start_time);
    return s >= weekStart && s <= weekEnd;
  });
  const weekRevenue = sumRevenue(weekAppts, now);
  const weekApptCount = weekAppts.filter((a) => a.status !== "Cancelled").length;

  // Daily maps for calendar
  const dailyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => {
      if (!isRevenueEligible(a, now)) return;
      const key = new Date(a.start_time).toDateString();
      map[key] = (map[key] || 0) + Number(a.services?.price || 0);
    });
    return map;
  }, [appointments, now]);

  const dailyCount = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => {
      if (a.status === "Cancelled") return;
      const key = new Date(a.start_time).toDateString();
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [appointments]);

  // Bar chart data — last 6 months placeholder using current month data
  const chartData = useMemo(() => {
    const d = new Date(viewDate);
    return [
      { name: monthLabel(d).split(" ")[0], Revenue: monthRevenue, Expenses: totalExpenses },
    ];
  }, [viewDate, monthRevenue, totalExpenses]);

  const stats = [
    { label: "Month Revenue", value: formatCurrency(monthRevenue), icon: DollarSign, color: "hsl(var(--success))" },
    { label: "Total Expenses", value: formatCurrency(totalExpenses), icon: TrendingDown, color: "hsl(var(--destructive))", subtitle: `Manual: €${monthExpenses.toFixed(0)} · Commissions: €${monthCommissions.toFixed(0)}` },
    { label: "Net Profit", value: formatCurrency(netProfit), icon: Wallet, color: netProfit >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))", highlight: true, positive: netProfit >= 0 },
    { label: "No-Shows", value: String(monthNoShows), icon: UserX, color: "hsl(var(--destructive))" },
  ];

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue, expenses &amp; profit insights</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* Weekly summary bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-apple flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">This Week</p>
          <p className="text-lg font-semibold mt-0.5">{formatCurrency(weekRevenue)} <span className="text-sm font-normal text-muted-foreground">· {weekApptCount} appointments</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{monthLabel(viewDate)}</p>
          <p className="text-lg font-semibold mt-0.5">{formatCurrency(monthRevenue)} <span className="text-sm font-normal text-muted-foreground">· {monthAppts} appts</span></p>
        </div>
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-apple">
        <h3 className="text-sm font-semibold mb-4">Revenue vs Expenses</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `€${v}`} />
            <Tooltip formatter={(v: number) => `€${v.toFixed(0)}`} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            <Legend />
            <Bar dataKey="Revenue" fill="hsl(145 63% 42%)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Expenses" fill="hsl(0 72% 51%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Calendar */}
      <ReportsCalendar
        viewDate={viewDate}
        onNavigate={navigate}
        dailyRevenue={dailyRevenue}
        dailyCount={dailyCount}
        now={now}
      />
    </motion.div>
  );
}
