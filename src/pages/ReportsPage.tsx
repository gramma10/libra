import { motion } from "framer-motion";
import { TrendingUp, CreditCard, Banknote, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const revenueData = [
  { day: "Mon", cash: 320, card: 480 },
  { day: "Tue", cash: 200, card: 620 },
  { day: "Wed", cash: 450, card: 350 },
  { day: "Thu", cash: 280, card: 510 },
  { day: "Fri", cash: 600, card: 720 },
  { day: "Sat", cash: 800, card: 950 },
  { day: "Sun", cash: 0, card: 0 },
];

const staffPerformance = [
  { name: "Maria K.", revenue: 3200, color: "hsl(160, 45%, 50%)" },
  { name: "Elena P.", revenue: 2800, color: "hsl(280, 40%, 60%)" },
  { name: "Nikos T.", revenue: 2100, color: "hsl(25, 80%, 55%)" },
  { name: "Sofia R.", revenue: 1900, color: "hsl(200, 60%, 55%)" },
];

const stats = [
  { label: "Today's Revenue", value: "€1,240", icon: TrendingUp, change: "+12%" },
  { label: "Card Payments", value: "€820", icon: CreditCard, change: "+8%" },
  { label: "Cash Payments", value: "€420", icon: Banknote, change: "+3%" },
  { label: "Clients Today", value: "14", icon: Users, change: "+2" },
];

export default function ReportsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Financial overview & staff performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-apple"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs font-medium text-success">{stat.change}</span>
              </div>
              <p className="text-2xl font-semibold mt-3">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="col-span-2 rounded-2xl border border-border bg-card p-6 shadow-apple">
          <h3 className="text-sm font-semibold mb-4">Daily Revenue — Cash vs Card</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 45%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 0%, 45%)" />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(0,0%,91%)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="cash" fill="hsl(0, 0%, 75%)" radius={[6, 6, 0, 0]} name="Cash" />
              <Bar dataKey="card" fill="hsl(0, 0%, 15%)" radius={[6, 6, 0, 0]} name="Card" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staff Performance */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-apple">
          <h3 className="text-sm font-semibold mb-4">Top Staff Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={staffPerformance}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="revenue"
              >
                {staffPerformance.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid hsl(0,0%,91%)", fontSize: "12px" }}
                formatter={(value: number) => [`€${value}`, "Revenue"]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {staffPerformance.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                </div>
                <span className="font-medium">€{s.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
