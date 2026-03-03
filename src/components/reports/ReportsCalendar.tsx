import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const formatCurrency = (v: number) => `€${v.toFixed(0)}`;
const monthLabel = (d: Date) => d.toLocaleString("default", { month: "long", year: "numeric" });

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

interface Props {
  viewDate: Date;
  onNavigate: (dir: number) => void;
  dailyRevenue: Record<string, number>;
  dailyCount: Record<string, number>;
  now: Date;
}

export default function ReportsCalendar({ viewDate, onNavigate, dailyRevenue, dailyCount, now }: Props) {
  const grid = getMonthGrid(viewDate);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));
  const todayStr = now.toDateString();

  return (
    <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => onNavigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">{monthLabel(viewDate)}</h3>
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => onNavigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {DAYS.map((d) => (
          <div key={d} className="text-center py-2 text-[11px] font-medium text-muted-foreground uppercase">{d}</div>
        ))}
      </div>

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
  );
}
