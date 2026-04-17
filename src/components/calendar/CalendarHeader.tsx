import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export type CalendarView = "day" | "3day" | "week" | "month";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (dir: number) => void;
  onToday: () => void;
  onNewBooking: () => void;
}

export default function CalendarHeader({ currentDate, view, onViewChange, onNavigate, onToday, onNewBooking }: CalendarHeaderProps) {
  const { t, locale } = useLanguage();

  const formatDate = (d: Date, v: CalendarView) => {
    if (v === "month") return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    if (v === "week") {
      const start = new Date(d);
      start.setDate(start.getDate() - start.getDay() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (v === "3day") {
      const end = new Date(d);
      end.setDate(end.getDate() + 2);
      return `${d.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return d.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
  };

  const viewLabels: Record<CalendarView, string> = {
    day: t("calendar.day"),
    "3day": t("calendar.threeDay"),
    week: t("calendar.week"),
    month: t("calendar.month"),
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 flex-shrink-0 gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{t("calendar.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{formatDate(currentDate, view)}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(["day", "3day", "week", "month"] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => onNavigate(-1)}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button variant="outline" className="rounded-xl px-3 text-xs h-8" onClick={onToday}>{t("calendar.today")}</Button>
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => onNavigate(1)}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
        <Button className="rounded-xl gap-1.5 h-8 text-xs" onClick={onNewBooking}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">{t("calendar.newBooking")}</span>
          <span className="sm:hidden">+</span>
        </Button>
      </div>
    </div>
  );
}
