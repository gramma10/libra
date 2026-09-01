import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/hooks/useLanguage";

interface PerShopRevenueChartProps {
  /** One data point per period (month). Each row carries one numeric series per shop, keyed by the shop name. */
  data: Array<{ name: string } & Record<string, string | number>>;
  /** Ordered list of shops to render — defines bar order, color, and stack id. */
  shops: { id: string; name: string }[];
  /** When true, bars are stacked; otherwise rendered side-by-side. */
  stacked?: boolean;
}

const palette = [
  "hsl(210 90% 55%)",
  "hsl(145 63% 42%)",
  "hsl(30 95% 55%)",
  "hsl(280 70% 55%)",
  "hsl(0 72% 51%)",
  "hsl(180 65% 45%)",
];

export default function PerShopRevenueChart({ data, shops, stacked = true }: PerShopRevenueChartProps) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-apple">
      <h3 className="text-sm font-semibold mb-4">{t("franchise.perShopRevenueTitle")}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `€${v}`} />
          <Tooltip
            formatter={(v: number) => `€${v.toFixed(0)}`}
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
          />
          <Legend />
          {shops.map((shop, i) => (
            <Bar
              key={shop.id}
              dataKey={shop.name}
              stackId={stacked ? "shops" : undefined}
              fill={palette[i % palette.length]}
              radius={i === shops.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
