import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, CreditCard, Banknote, Users, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const [txRes, apptRes] = await Promise.all([
        supabase.from("transactions").select("*").gte("created_at", startOfWeek.toISOString()).order("created_at"),
        supabase.from("appointments").select("id").gte("start_time", todayStart.toISOString()).lte("start_time", todayEnd.toISOString()),
      ]);

      setTransactions(txRes.data || []);
      setTodayAppointments(apptRes.data?.length || 0);
      setLoading(false);
    };
    fetch();
  }, []);

  const todayTx = transactions.filter((t) => {
    const d = new Date(t.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const todayRevenue = todayTx.reduce((a, t) => a + Number(t.amount_total), 0);
  const todayCash = todayTx.filter((t) => t.payment_method === "Cash").reduce((a, t) => a + Number(t.amount_total), 0);
  const todayCard = todayTx.filter((t) => t.payment_method !== "Cash").reduce((a, t) => a + Number(t.amount_total), 0);

  const stats = [
    { label: "Today's Revenue", value: `€${todayRevenue.toFixed(0)}`, icon: TrendingUp },
    { label: "Card Payments", value: `€${todayCard.toFixed(0)}`, icon: CreditCard },
    { label: "Cash Payments", value: `€${todayCash.toFixed(0)}`, icon: Banknote },
    { label: "Appointments Today", value: String(todayAppointments), icon: Users },
  ];

  // Group transactions by day of week for chart
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const chartData = days.map((day, i) => {
    const dayTx = transactions.filter((t) => {
      const d = new Date(t.created_at);
      return d.getDay() === (i + 1) % 7;
    });
    return {
      day,
      cash: dayTx.filter((t) => t.payment_method === "Cash").reduce((a, t) => a + Number(t.amount_total), 0),
      card: dayTx.filter((t) => t.payment_method !== "Cash").reduce((a, t) => a + Number(t.amount_total), 0),
    };
  });

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Financial overview for this week</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-2xl border border-border bg-card p-5 shadow-apple">
              <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-2xl font-semibold mt-3">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-apple">
        <h3 className="text-sm font-semibold mb-4">Weekly Revenue — Cash vs Card</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No transactions this week yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 45%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 45%)" />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(0,0%,91%)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: "12px" }} />
              <Bar dataKey="cash" fill="hsl(0, 0%, 75%)" radius={[6, 6, 0, 0]} name="Cash" />
              <Bar dataKey="card" fill="hsl(0, 0%, 15%)" radius={[6, 6, 0, 0]} name="Card" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
