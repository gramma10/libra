import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatProps {
  stat: {
    label: string;
    value: string;
    icon: LucideIcon;
    color: string;
    subtitle?: string;
    highlight?: boolean;
    positive?: boolean;
  };
  index: number;
}

export default function StatCard({ stat, index }: StatProps) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-apple"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-xl p-2" style={{ backgroundColor: stat.color + "15" }}>
          <Icon className="h-4 w-4" style={{ color: stat.color }} strokeWidth={2} />
        </div>
      </div>
      <p
        className={`text-2xl font-semibold mt-3 tracking-tight ${stat.highlight ? (stat.positive ? "text-[hsl(var(--success))]" : "text-destructive") : ""}`}
      >
        {stat.value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
      {stat.subtitle && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.subtitle}</p>
      )}
    </motion.div>
  );
}
