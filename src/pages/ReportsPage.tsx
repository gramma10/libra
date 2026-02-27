import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, Calendar, UserX, TrendingUp, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getMonthGrid = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = Array.from({ length: startOffset }, () => null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

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

/** Revenue counts if: status is NOT 'Cancelled' or 'No-Show', AND end_time has passed */
const isRevenueEligible = (a: Appointment, now: Date) =>
  a.status !== "Cancelled" &&
  a.status !== "No-Show" &&
  new Date(a.end_time) <= now;

const sumRevenue = (appts: Appointment[], now: Date) =>
  appts.filter((a) => isRevenueEligible(a, now)).reduce((s, a) => s + Number(a.services?.price || 0), 0);

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const now = useMemo(() => new Date(), []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const { data } = await supabase
      .from("appointments")
      .select("id, start_time, end_time, status, is_paid, service_id, staff_id, services(price, service_name)")
      .gte("start_time", start.toISOString())
      .lte("start_time", end.toISOString())
      .order("start_time");

    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  }, [viewDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const navigate = (dir: number) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + dir);
    setViewDate(d);
  };

  // --- Stats ---
  const monthRevenue = sumRevenue(appointments, now);
  const monthAppts = appointments.filter((a) => a.status !== "Cancelled").length;
  const monthNoShows = appointments.filter((a) => a.status === "No-Show").length;

  // Current week stats (week containing today)
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

  // Daily revenue map
  const dailyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => {
      if (!isRevenueEligible(a, now)) return;
      const key = new Date(a.start_time).toDateString();
      map[key] = (map[key] || 0) + Number(a.services?.price || 0);
    });
    return map;
  }, [appointments, now]);

  // Daily appointment count
  const dailyCount = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => {
      if (a.status === "Cancelled") return;
      const key = new Date(a.start_time).toDateString();
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [appointments]);

  const grid = getMonthGrid(viewDate);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));
  const todayStr = now.toDateString();

  const stats = [
    { label: "Month Revenue", value: formatCurrency(monthRevenue), icon: DollarSign, color: "hsl(var(--success))" },
    { label: "Week Revenue", value: formatCurrency(weekRevenue), icon: TrendingUp, color: "hsl(var(--primary))" },
    { label: "Month Appointments", value: String(monthAppts), icon: Calendar, color: "hsl(210 80% 55%)" },
    { label: "No-Shows", value: String(monthNoShows), icon: UserX, color: "hsl(var(--destructive))" },
  ];

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue &amp; appointment insights</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-apple"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl p-2" style={{ backgroundColor: stat.color + "15" }}>
                  <Icon className="h-4 w-4" style={{ color: stat.color }} strokeWidth={2} />
                </div>
              </div>
              <p className="text-2xl font-semibold mt-3 tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
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

      {/* Calendar */}
      <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden">
        {/* Calendar nav */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold">{monthLabel(viewDate)}</h3>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {DAYS.map((d) => (
            <div key={d} className="text-center py-2 text-[11px] font-medium text-muted-foreground uppercase">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/40 last:border-b-0" style={{ minHeight: 80 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} className="border-r border-border/30 last:border-r-0 bg-muted/10" />;
              const dayStr = day.toDateString();
              const isToday = dayStr === todayStr;
              const rev = dailyRevenue[dayStr] || 0;
              const count = dailyCount[dayStr] || 0;

              return (
                <div key={di} className="border-r border-border/30 last:border-r-0 p-2 transition-colors hover:bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                      {day.getDate()}
                    </div>
                    {count > 0 && (
                      <span className="text-[9px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{count}</span>
                    )}
                  </div>
                  {rev > 0 && (
                    <div className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "hsl(145 63% 42% / 0.12)", color: "hsl(var(--success))" }}>
                      {formatCurrency(rev)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
