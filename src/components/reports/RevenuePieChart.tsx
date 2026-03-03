import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(145, 63%, 42%)",
  "hsl(200, 70%, 50%)",
  "hsl(280, 50%, 55%)",
  "hsl(25, 80%, 55%)",
  "hsl(340, 60%, 55%)",
  "hsl(170, 55%, 45%)",
  "hsl(50, 80%, 50%)",
  "hsl(0, 65%, 50%)",
];

interface RevenueEntry {
  name: string;
  value: number;
}

interface Props {
  data: RevenueEntry[];
  title: string;
}

const renderLabel = ({ name, percent }: { name: string; percent: number }) =>
  percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : "";

export default function RevenuePieChart({ data, title }: Props) {
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-apple">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No data for this period</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-apple">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={50}
            paddingAngle={2}
            label={renderLabel}
            labelLine={false}
          >
            {filtered.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => `€${v.toFixed(2)}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              fontSize: 12,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
