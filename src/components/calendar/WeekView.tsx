import { useRef, useEffect } from "react";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const HOUR_HEIGHT = 56;
const formatHour = (h: number) => (h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`);

const getWeekDays = (date: Date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

interface WeekViewProps {
  date: Date;
  appointments: any[];
  onCellClick: (staffId: string, hour: number, minutes: number, day?: Date) => void;
}

export default function WeekView({ date, appointments, onCellClick }: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = getWeekDays(date);
  const today = new Date();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [date]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Day headers */}
      <div className="flex border-b border-border bg-muted/30 flex-shrink-0">
        <div className="w-16 flex-shrink-0 border-r border-border" />
        {days.map((d) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={d.toISOString()} className="flex-1 min-w-[100px] px-2 py-2.5 text-center border-r border-border last:border-r-0">
              <span className="text-[10px] text-muted-foreground uppercase">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <div className={`text-lg font-semibold mt-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="overflow-auto flex-1">
        <div className="relative" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
          {HOURS.map((hour) => (
            <div key={hour} className="flex border-b border-border/40" style={{ height: HOUR_HEIGHT }}>
              <div className="w-16 flex-shrink-0 border-r border-border flex items-start justify-end pr-2 pt-1">
                <span className="text-[11px] text-muted-foreground font-medium">{formatHour(hour)}</span>
              </div>
              {days.map((d) => (
                <div key={d.toISOString()} className="flex-1 min-w-[100px] border-r border-border/30 last:border-r-0 relative">
                  <div className="absolute inset-x-0 top-0 h-1/2 cursor-pointer hover:bg-primary/5 transition-colors border-b border-dashed border-border/20" onClick={() => onCellClick("", hour, 0, d)} />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => onCellClick("", hour, 30, d)} />
                </div>
              ))}
            </div>
          ))}

          {/* Appointment blocks */}
          {days.map((day, colIndex) => {
            const dayStr = day.toDateString();
            const dayAppts = appointments.filter((a: any) => new Date(a.start_time).toDateString() === dayStr);
            return dayAppts.map((appt: any) => {
              const start = new Date(appt.start_time);
              const end = new Date(appt.end_time);
              const topOffset = (start.getHours() + start.getMinutes() / 60 - HOURS[0]) * HOUR_HEIGHT;
              const height = ((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT;
              const color = appt.services?.category_color || "#6366f1";
              return (
                <div key={appt.id} className="absolute rounded-lg p-1.5 cursor-pointer transition-all hover:shadow-lg text-white z-10 overflow-hidden"
                  style={{
                    top: `${topOffset + 1}px`, height: `${Math.max(height - 2, 20)}px`,
                    left: `calc(64px + (100% - 64px) * ${colIndex} / 7 + 2px)`,
                    width: `calc((100% - 64px) / 7 - 4px)`,
                    backgroundColor: color,
                  }}>
                  <p className="text-[10px] font-semibold leading-tight truncate">{appt.clients?.first_name} {appt.clients?.last_name}</p>
                  {height > 28 && <p className="text-[9px] opacity-80 truncate">{appt.services?.service_name}</p>}
                </div>
              );
            });
          })}

          {/* Current time */}
          {days.some(d => d.toDateString() === today.toDateString()) && (() => {
            const now = new Date();
            const nowOffset = (now.getHours() + now.getMinutes() / 60 - HOURS[0]) * HOUR_HEIGHT;
            if (nowOffset < 0 || nowOffset > HOURS.length * HOUR_HEIGHT) return null;
            return (
              <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${nowOffset}px` }}>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1" />
                  <div className="flex-1 h-[2px] bg-destructive" />
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
