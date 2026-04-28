import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, DollarSign, Wallet, CalendarCheck, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import StatCard from "@/components/reports/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";

interface Appointment {
  id: string; start_time: string; end_time: string; status: string;
  services: { price: number; service_name: string } | null;
  clients: { first_name: string; last_name: string } | null;
}
interface StaffInfo { commission_rate: number; first_name: string; last_name: string; }

const statusColors: Record<string, string> = {
  Completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "No-Show": "bg-muted text-muted-foreground",
};

export default function MyStatsPage() {
  const { staffRecordId } = useRole();
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());

  const monthStart = useMemo(() => new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString(), [viewDate]);
  const monthEnd = useMemo(() => new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(), [viewDate]);
  const monthLbl = viewDate.toLocaleString(locale, { month: "long", year: "numeric" });

  useEffect(() => {
    if (!staffRecordId) return;
    const fetchData = async () => {
      setLoading(true);
      const [apptRes, staffRes] = await Promise.all([
        supabase.from("appointments").select("id, start_time, end_time, status, services!appointments_service_id_fkey(price, service_name), clients!appointments_client_fk(first_name, last_name)").eq("staff_id", staffRecordId).gte("start_time", monthStart).lte("start_time", monthEnd).order("start_time", { ascending: false }),
        supabase.from("staff").select("commission_rate, first_name, last_name").eq("id", staffRecordId).single(),
      ]);
      setAppointments((apptRes.data as any[]) || []);
      setStaffInfo(staffRes.data as StaffInfo | null);
      setLoading(false);
    };
    fetchData();
  }, [staffRecordId, monthStart, monthEnd]);

  const completed = appointments.filter((a) => a.status === "Completed");
  const totalRevenue = completed.reduce((s, a) => s + Number(a.services?.price || 0), 0);
  const commissionRate = Number(staffInfo?.commission_rate || 0);
  const myCommissions = totalRevenue * commissionRate / 100;
  const totalAppointments = appointments.filter((a) => a.status !== "Cancelled").length;

  const stats = [
    { label: t("myStats.revenueCompleted"), value: `€${totalRevenue.toFixed(0)}`, icon: DollarSign, color: "hsl(var(--success))" },
    { label: `${t("myStats.commissions")} (${commissionRate}%)`, value: `€${myCommissions.toFixed(0)}`, icon: Wallet, color: "hsl(var(--primary))" },
    { label: t("myStats.completed"), value: String(completed.length), icon: CalendarCheck, color: "hsl(var(--accent-foreground))" },
    { label: t("myStats.totalAppointments"), value: String(totalAppointments), icon: Calendar, color: "hsl(var(--secondary-foreground))" },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  if (!staffRecordId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">{t("myStats.notLinked")}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {t("myStats.title")} {staffInfo && `— ${staffInfo.first_name} ${staffInfo.last_name}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">{monthLbl}</span>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, i) => (<StatCard key={stat.label} stat={stat} index={i} />))}
      </div>

      {completed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-apple">
          <h3 className="text-sm font-semibold mb-3">{t("myStats.revenueByService")}</h3>
          <div className="space-y-2">
            {Object.entries(
              completed.reduce<Record<string, { count: number; total: number }>>((acc, a) => {
                const name = a.services?.service_name || "Unknown";
                if (!acc[name]) acc[name] = { count: 0, total: 0 };
                acc[name].count++;
                acc[name].total += Number(a.services?.price || 0);
                return acc;
              }, {})
            ).map(([name, { count, total }]) => (
              <div key={name} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div><span className="text-sm font-medium">{name}</span><span className="text-xs text-muted-foreground ml-2">× {count}</span></div>
                <span className="text-sm font-semibold" style={{ color: "hsl(var(--success))" }}>€{total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">{t("myStats.allAppointments")}</h3></div>
        <div className="divide-y divide-border/50">
          {appointments.length === 0 && (<p className="p-4 text-sm text-muted-foreground text-center">{t("myStats.noAppointments")}</p>)}
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{a.clients?.first_name} {a.clients?.last_name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.services?.service_name} · {new Date(a.start_time).toLocaleDateString(locale)} {new Date(a.start_time).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={statusColors[a.status] || ""}>{a.status}</Badge>
                <span className="text-sm font-semibold">€{Number(a.services?.price || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
