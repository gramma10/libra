import { useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const HOUR_HEIGHT = 60;

const STAFF_COLORS = [
  "hsl(210 80% 55%)", "hsl(340 75% 55%)", "hsl(150 60% 45%)",
  "hsl(30 85% 55%)", "hsl(270 65% 55%)", "hsl(180 60% 45%)",
];

interface ThreeDayViewProps {
  date: Date;
  staff: any[];
  appointments: any[];
  onCellClick: (staffId: string, hour: number, minutes: number, day?: Date) => void;
  onAppointmentClick?: (appointment: any) => void;
}

export default function ThreeDayView({ date, staff, appointments, onCellClick, onAppointmentClick }: ThreeDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { locale } = useLanguage();
  const today = new Date();

  const days = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatHour = (h: number) => {
    if (locale === "el-GR") return `${h}:00`;
    return h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`;
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [date]);

  const staffCount = Math.max(staff.length, 1);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Header: days + staff sub-columns */}
      <div className="border-b border-border bg-muted/30 flex-shrink-0 overflow-x-auto">
        <div className="flex" style={{ minWidth: `${64 + days.length * staffCount * 110}px` }}>
          <div className="w-16 flex-shrink-0 border-r border-border" />
          {days.map((d) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={d.toISOString()} className="flex-1 border-r-2 border-border last:border-r-0">
                <div className="px-2 py-2 text-center border-b border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase">{d.toLocaleDateString(locale, { weekday: "short" })}</span>
                  <div className={`text-base font-semibold mt-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>
                    {d.getDate()} {d.toLocaleDateString(locale, { month: "short" })}
                  </div>
                </div>
                <div className="flex">
                  {staff.map((s, i) => (
                    <div key={s.id} className="flex-1 min-w-[110px] px-1.5 py-1.5 text-center border-r border-border/40 last:border-r-0">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STAFF_COLORS[i % STAFF_COLORS.length] }} />
                        <span className="text-[11px] font-medium text-foreground truncate">{s.first_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="overflow-auto flex-1">
        <div className="relative" style={{ minHeight: HOURS.length * HOUR_HEIGHT, minWidth: `${64 + days.length * staffCount * 110}px` }}>
          {HOURS.map((hour) => (
            <div key={hour} className="flex border-b border-border/40" style={{ height: HOUR_HEIGHT }}>
              <div className="w-16 flex-shrink-0 border-r border-border flex items-start justify-end pr-2 pt-1">
                <span className="text-[11px] text-muted-foreground font-medium">{formatHour(hour)}</span>
              </div>
              {days.map((d) => (
                <div key={d.toISOString()} className="flex-1 flex border-r-2 border-border last:border-r-0">
                  {staff.map((s) => (
                    <div key={s.id} className="flex-1 min-w-[110px] border-r border-border/30 last:border-r-0 relative">
                      <div className="absolute inset-x-0 top-0 h-1/2 cursor-pointer hover:bg-primary/5 transition-colors border-b border-dashed border-border/20" onClick={() => onCellClick(s.id, hour, 0, d)} />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => onCellClick(s.id, hour, 30, d)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Appointments */}
          {days.map((day, dayIndex) => {
            const dayStr = day.toDateString();
            return staff.map((s, staffIndex) => {
              const cellAppts = appointments.filter((a: any) =>
                a.staff_id === s.id && new Date(a.start_time).toDateString() === dayStr
              );
              return cellAppts.map((appt: any) => {
                const start = new Date(appt.start_time);
                const end = new Date(appt.end_time);
                const topOffset = (start.getHours() + start.getMinutes() / 60 - HOURS[0]) * HOUR_HEIGHT;
                const height = ((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT;
                const isNoShow = appt.status === "No-Show";
                const color = isNoShow ? "hsl(0 0% 60%)" : (appt.services?.category_color || "#6366f1");
                const totalCols = days.length * staffCount;
                const colPosition = dayIndex * staffCount + staffIndex;
                return (
                  <div
                    key={appt.id}
                    onClick={() => onAppointmentClick?.(appt)}
                    className={`absolute rounded-lg p-1.5 cursor-pointer transition-all hover:shadow-lg z-10 overflow-hidden text-white ${isNoShow ? "opacity-60" : "hover:brightness-110"}`}
                    style={{
                      top: `${topOffset + 1}px`,
                      height: `${Math.max(height - 2, 22)}px`,
                      left: `calc(64px + (100% - 64px) * ${colPosition} / ${totalCols} + 2px)`,
                      width: `calc((100% - 64px) / ${totalCols} - 4px)`,
                      backgroundColor: color,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] font-semibold leading-tight truncate">{appt.clients?.first_name} {appt.clients?.last_name}</p>
                      {appt.reminder_sent && <Bell className="h-2.5 w-2.5 flex-shrink-0 opacity-80" />}
                    </div>
                    {height > 30 && <p className="text-[9px] opacity-80 truncate">{appt.services?.service_name}</p>}
                  </div>
                );
              });
            });
          })}

          {/* Now indicator */}
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
