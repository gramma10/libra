import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, DollarSign, Wallet, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import StatCard from "@/components/reports/StatCard";

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  services: { price: number; service_name: string } | null;
  clients: { first_name: string; last_name: string } | null;
}

interface StaffInfo {
  commission_rate: number;
  first_name: string;
  last_name: string;
}

export default function MyStatsPage() {
  const { staffRecordId } = useRole();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), [now]);
  const monthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(), [now]);

  useEffect(() => {
    if (!staffRecordId) return;

    const fetch = async () => {
      setLoading(true);
      const [apptRes, staffRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, start_time, end_time, status, services(price, service_name), clients(first_name, last_name)")
          .eq("staff_id", staffRecordId)
          .gte("start_time", monthStart)
          .lte("start_time", monthEnd)
          .order("start_time", { ascending: false }),
        supabase
          .from("staff")
          .select("commission_rate, first_name, last_name")
          .eq("id", staffRecordId)
          .single(),
      ]);
      setAppointments((apptRes.data as any[]) || []);
      setStaffInfo(staffRes.data as StaffInfo | null);
      setLoading(false);
    };
    fetch();
  }, [staffRecordId, monthStart, monthEnd]);

  const completed = appointments.filter((a) => a.status === "Completed");
  const totalRevenue = completed.reduce((s, a) => s + Number(a.services?.price || 0), 0);
  const commissionRate = Number(staffInfo?.commission_rate || 0);
  const myCommissions = totalRevenue * commissionRate / 100;

  const stats = [
    { label: "My Revenue This Month", value: `€${totalRevenue.toFixed(0)}`, icon: DollarSign, color: "hsl(var(--success))" },
    { label: `My Commissions (${commissionRate}%)`, value: `€${myCommissions.toFixed(0)}`, icon: Wallet, color: "hsl(var(--primary))" },
    { label: "Completed Appointments", value: String(completed.length), icon: CalendarCheck, color: "hsl(var(--accent-foreground))" },
  ];

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!staffRecordId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">Your account is not linked to a staff profile. Ask an admin to link it.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          My Stats {staffInfo && `— ${staffInfo.first_name} ${staffInfo.last_name}`}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {now.toLocaleString("default", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* Revenue by service */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-apple">
        <h3 className="text-sm font-semibold mb-3">Revenue by Service</h3>
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
              <div>
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground ml-2">× {count}</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: "hsl(var(--success))" }}>€{total.toFixed(2)}</span>
            </div>
          ))}
          {completed.length === 0 && <p className="text-sm text-muted-foreground">No completed appointments this month.</p>}
        </div>
      </div>

      {/* Completed Appointments List */}
      <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">Completed Appointments</h3>
        </div>
        <div className="divide-y divide-border/50">
          {completed.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">No completed appointments.</p>
          )}
          {completed.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div>
                <p className="text-sm font-medium">
                  {a.clients?.first_name} {a.clients?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.services?.service_name} · {new Date(a.start_time).toLocaleDateString()} {new Date(a.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-sm font-semibold">€{Number(a.services?.price || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
