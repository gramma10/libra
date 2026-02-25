import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CalendarView = "day" | "week" | "month";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (dir: number) => void;
  onToday: () => void;
  onNewBooking: () => void;
}

const formatDate = (d: Date, view: CalendarView) => {
  if (view === "month") return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (view === "week") {
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

export default function CalendarHeader({ currentDate, view, onViewChange, onNavigate, onToday, onNewBooking }: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-4 flex-shrink-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{formatDate(currentDate, view)}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(["day", "week", "month"] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="rounded-xl" onClick={() => onNavigate(-1)}>
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <Button variant="outline" className="rounded-xl px-4 text-sm" onClick={onToday}>Today</Button>
        <Button variant="outline" size="icon" className="rounded-xl" onClick={() => onNavigate(1)}>
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <Button className="rounded-xl ml-2 gap-2" onClick={onNewBooking}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Booking
        </Button>
      </div>
    </div>
  );
}
