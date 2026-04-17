import { useLanguage } from "@/hooks/useLanguage";

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

interface MonthViewProps {
  date: Date;
  appointments: any[];
  onDayClick: (day: Date) => void;
}

export default function MonthView({ date, appointments, onDayClick }: MonthViewProps) {
  const { t } = useLanguage();
  const grid = getMonthGrid(date);
  const today = new Date();
  const currentMonth = date.getMonth();
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  const dayKeys: Array<"day.mon" | "day.tue" | "day.wed" | "day.thu" | "day.fri" | "day.sat" | "day.sun"> = [
    "day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {dayKeys.map((d) => (
          <div key={d} className="text-center py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/40 last:border-r-0">
            {t(d)}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto grid auto-rows-fr" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(110px, 1fr))` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/40 last:border-b-0">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="border-r border-border/30 last:border-r-0 bg-muted/10" />;
              const dayStr = day.toDateString();
              const isToday = dayStr === today.toDateString();
              const isWeekend = di >= 5;
              const dayAppts = appointments.filter((a: any) => new Date(a.start_time).toDateString() === dayStr)
                .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
              return (
                <div
                  key={di}
                  className={`border-r border-border/30 last:border-r-0 p-1.5 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col gap-1 overflow-hidden ${isWeekend ? "bg-muted/10" : ""}`}
                  onClick={() => onDayClick(day)}
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                      {day.getDate()}
                    </div>
                    {dayAppts.length > 0 && (
                      <span className="text-[9px] text-muted-foreground font-medium">{dayAppts.length}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-h-0">
                    {dayAppts.slice(0, 3).map((a: any) => {
                      const time = new Date(a.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
                      return (
                        <div
                          key={a.id}
                          className="text-[9px] truncate rounded px-1 py-0.5 text-white font-medium flex items-center gap-1"
                          style={{ backgroundColor: a.services?.category_color || "#6366f1" }}
                        >
                          <span className="opacity-90">{time}</span>
                          <span className="truncate">{a.clients?.first_name}</span>
                        </div>
                      );
                    })}
                    {dayAppts.length > 3 && (
                      <div className="text-[9px] text-muted-foreground font-medium px-1">+{dayAppts.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
