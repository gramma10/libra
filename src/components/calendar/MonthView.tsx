const getMonthGrid = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
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
  const grid = getMonthGrid(date);
  const today = new Date();
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center py-2 text-[11px] font-medium text-muted-foreground uppercase">{d}</div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/40 last:border-b-0" style={{ minHeight: 100 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} className="border-r border-border/30 last:border-r-0 bg-muted/10" />;
              const dayStr = day.toDateString();
              const isToday = dayStr === today.toDateString();
              const dayAppts = appointments.filter((a: any) => new Date(a.start_time).toDateString() === dayStr);
              return (
                <div key={di} className="border-r border-border/30 last:border-r-0 p-1.5 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => onDayClick(day)}>
                  <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map((a: any) => (
                      <div key={a.id} className="text-[9px] truncate rounded px-1 py-0.5 text-white font-medium" style={{ backgroundColor: a.services?.category_color || "#6366f1" }}>
                        {a.clients?.first_name} {a.clients?.last_name}
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <div className="text-[9px] text-muted-foreground font-medium px-1">+{dayAppts.length - 3} more</div>
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
