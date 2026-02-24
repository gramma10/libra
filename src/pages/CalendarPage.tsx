import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 9AM - 7PM
const STAFF = ["Maria K.", "Elena P.", "Nikos T.", "Sofia R."];

type ServiceType = "haircut" | "color" | "styling" | "treatment";

interface Appointment {
  id: string;
  client: string;
  service: ServiceType;
  serviceLabel: string;
  hour: number;
  duration: number; // in hours
  staffIndex: number;
}

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: "1", client: "Anna M.", service: "haircut", serviceLabel: "Haircut & Blowdry", hour: 10, duration: 1, staffIndex: 0 },
  { id: "2", client: "George L.", service: "color", serviceLabel: "Full Color", hour: 11, duration: 2, staffIndex: 1 },
  { id: "3", client: "Eleni K.", service: "styling", serviceLabel: "Bridal Styling", hour: 14, duration: 2, staffIndex: 2 },
  { id: "4", client: "Maria S.", service: "treatment", serviceLabel: "Keratin Treatment", hour: 9, duration: 1.5, staffIndex: 0 },
  { id: "5", client: "Kostas D.", service: "haircut", serviceLabel: "Men's Cut", hour: 13, duration: 0.5, staffIndex: 3 },
  { id: "6", client: "Dimitra P.", service: "color", serviceLabel: "Highlights", hour: 15, duration: 2.5, staffIndex: 1 },
  { id: "7", client: "Yannis B.", service: "styling", serviceLabel: "Event Updo", hour: 16, duration: 1.5, staffIndex: 3 },
];

const UNASSIGNED: Appointment[] = [
  { id: "u1", client: "Christina V.", service: "haircut", serviceLabel: "Trim & Style", hour: 11, duration: 1, staffIndex: -1 },
  { id: "u2", client: "Panagiotis R.", service: "treatment", serviceLabel: "Scalp Treatment", hour: 14, duration: 1, staffIndex: -1 },
];

const serviceColors: Record<ServiceType, { bg: string; text: string }> = {
  haircut: { bg: "bg-service-haircut", text: "text-service-haircut-fg" },
  color: { bg: "bg-service-color", text: "text-service-color-fg" },
  styling: { bg: "bg-service-styling", text: "text-service-styling-fg" },
  treatment: { bg: "bg-service-treatment", text: "text-service-treatment-fg" },
};

const today = new Date();
const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(today);

  const goDay = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(currentDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => goDay(-1)}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button variant="outline" className="rounded-xl px-4 text-sm" onClick={() => setCurrentDate(today)}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => goDay(1)}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button className="rounded-xl ml-2 gap-2">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New Booking
          </Button>
        </div>
      </div>

      {/* Unassigned */}
      {UNASSIGNED.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-xs font-medium text-warning mb-3 uppercase tracking-wide">
            Unassigned Bookings ({UNASSIGNED.length})
          </p>
          <div className="flex gap-3 flex-wrap">
            {UNASSIGNED.map((appt) => (
              <div
                key={appt.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-grab",
                  serviceColors[appt.service].bg,
                  serviceColors[appt.service].text
                )}
              >
                <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="font-medium">{appt.client}</span>
                <span className="opacity-70">· {appt.serviceLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden">
        {/* Staff header */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: `64px repeat(${STAFF.length}, 1fr)` }}>
          <div className="p-3 border-r border-border" />
          {STAFF.map((name) => (
            <div key={name} className="flex items-center gap-2 p-3 border-r border-border last:border-r-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                <User className="h-3.5 w-3.5 text-secondary-foreground" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium">{name}</span>
            </div>
          ))}
        </div>

        {/* Time rows */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-border/50 last:border-b-0"
              style={{ gridTemplateColumns: `64px repeat(${STAFF.length}, 1fr)`, height: "72px" }}
            >
              <div className="flex items-start justify-end pr-3 pt-2 text-xs text-muted-foreground border-r border-border">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
              </div>
              {STAFF.map((_, si) => (
                <div key={si} className="relative border-r border-border/30 last:border-r-0" />
              ))}
            </div>
          ))}

          {/* Appointment blocks */}
          {MOCK_APPOINTMENTS.map((appt) => {
            const top = (appt.hour - 9) * 72;
            const height = appt.duration * 72 - 4;
            const col = appt.staffIndex;
            const colW = `calc((100% - 64px) / ${STAFF.length})`;
            const left = `calc(64px + ${col} * ${colW} + 4px)`;
            const width = `calc(${colW} - 8px)`;

            return (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 * parseInt(appt.id) }}
                className={cn(
                  "absolute rounded-xl p-2.5 cursor-pointer transition-shadow hover:shadow-apple-lg",
                  serviceColors[appt.service].bg,
                  serviceColors[appt.service].text
                )}
                style={{ top: `${top + 2}px`, height: `${height}px`, left, width }}
              >
                <p className="text-xs font-semibold leading-tight">{appt.client}</p>
                <p className="text-[10px] opacity-75 mt-0.5">{appt.serviceLabel}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {(Object.entries(serviceColors) as [ServiceType, typeof serviceColors.haircut][]).map(([key, colors]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-full", colors.bg)} />
            <span className="capitalize">{key}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
