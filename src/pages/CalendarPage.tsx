import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM - 7 PM
const HOUR_HEIGHT = 64; // px per hour

const today = new Date();
const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const formatHour = (h: number) =>
  h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`;

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(today);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({ client_id: "", service_id: "", staff_id: "", start_time: "" });
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);

  const fetchData = async () => {
    setLoading(true);
    const [apptRes, svcRes, clientRes, staffRes] = await Promise.all([
      supabase.from("appointments").select("*, clients(first_name, last_name), services(service_name, duration, category_color)").gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString()).order("start_time"),
      supabase.from("services").select("*").order("service_name"),
      supabase.from("clients").select("id, first_name, last_name").order("first_name"),
      supabase.from("staff").select("*").eq("is_active", true).order("first_name"),
    ]);
    setAppointments(apptRes.data || []);
    setServices(svcRes.data || []);
    setClients(clientRes.data || []);
    setStaff(staffRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate.toDateString()]);

  useEffect(() => {
    // Scroll to 8 AM on mount
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [loading]);

  const goDay = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const handleCellClick = (staffId: string, hour: number, minutes: number) => {
    const h = hour.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    setNewBooking({ client_id: "", service_id: "", staff_id: staffId, start_time: `${h}:${m}` });
    setShowNewBooking(true);
  };

  const handleNewBooking = async () => {
    if (!newBooking.client_id || !newBooking.service_id || !newBooking.start_time) {
      toast.error("Please fill all fields");
      return;
    }
    setSaving(true);
    const service = services.find((s: any) => s.id === newBooking.service_id);
    const startDt = new Date(`${currentDate.toISOString().split("T")[0]}T${newBooking.start_time}:00`);
    const endDt = new Date(startDt.getTime() + (service?.duration || 30) * 60000);

    const { error } = await supabase.from("appointments").insert({
      client_id: newBooking.client_id,
      service_id: newBooking.service_id,
      staff_id: newBooking.staff_id || null,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Booking created");
      setShowNewBooking(false);
      setNewBooking({ client_id: "", service_id: "", staff_id: "", start_time: "" });
      fetchData();
    }
    setSaving(false);
  };

  // Staff colors for columns
  const staffColors = [
    "hsl(210 80% 55%)",
    "hsl(340 75% 55%)",
    "hsl(150 60% 45%)",
    "hsl(30 85% 55%)",
    "hsl(270 65% 55%)",
    "hsl(180 60% 45%)",
  ];

  const getStaffColor = (index: number) => staffColors[index % staffColors.length];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(currentDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => goDay(-1)}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button variant="outline" className="rounded-xl px-4 text-sm" onClick={() => setCurrentDate(today)}>Today</Button>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => goDay(1)}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button className="rounded-xl ml-2 gap-2" onClick={() => { setNewBooking({ client_id: "", service_id: "", staff_id: "", start_time: "" }); setShowNewBooking(true); }}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New Booking
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 flex-1"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : staff.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Add employees first to see the calendar columns.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Staff header row */}
          <div className="flex border-b border-border bg-muted/30 flex-shrink-0">
            <div className="w-16 flex-shrink-0 border-r border-border" />
            {staff.map((s: any, i: number) => (
              <div
                key={s.id}
                className="flex-1 min-w-[140px] px-3 py-2.5 text-center border-r border-border last:border-r-0"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getStaffColor(i) }} />
                  <span className="text-sm font-medium text-foreground truncate">
                    {s.first_name} {s.last_name}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.role}</p>
              </div>
            ))}
          </div>

          {/* Scrollable time grid */}
          <div ref={scrollRef} className="overflow-auto flex-1">
            <div className="relative" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
              {/* Hour rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="flex border-b border-border/40" style={{ height: HOUR_HEIGHT }}>
                  {/* Time label */}
                  <div className="w-16 flex-shrink-0 border-r border-border flex items-start justify-end pr-2 pt-1">
                    <span className="text-[11px] text-muted-foreground font-medium">{formatHour(hour)}</span>
                  </div>
                  {/* Staff columns */}
                  {staff.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex-1 min-w-[140px] border-r border-border/30 last:border-r-0 relative"
                    >
                      {/* Top half-hour clickable */}
                      <div
                        className="absolute inset-x-0 top-0 h-1/2 cursor-pointer hover:bg-primary/5 transition-colors border-b border-dashed border-border/20"
                        onClick={() => handleCellClick(s.id, hour, 0)}
                      />
                      {/* Bottom half-hour clickable */}
                      <div
                        className="absolute inset-x-0 bottom-0 h-1/2 cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => handleCellClick(s.id, hour, 30)}
                      />
                    </div>
                  ))}
                </div>
              ))}

              {/* Appointment blocks - rendered inside each staff column */}
              {staff.map((s: any, colIndex: number) => {
                const staffAppts = appointments.filter((a: any) => a.staff_id === s.id);
                return staffAppts.map((appt: any) => {
                  const start = new Date(appt.start_time);
                  const end = new Date(appt.end_time);
                  const topOffset = (start.getHours() + start.getMinutes() / 60 - HOURS[0]) * HOUR_HEIGHT;
                  const height = ((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT;
                  const color = appt.services?.category_color || "#6366f1";

                  return (
                    <div
                      key={appt.id}
                      className="absolute rounded-lg p-2 cursor-pointer transition-all hover:shadow-lg hover:brightness-110 text-white z-10 overflow-hidden"
                      style={{
                        top: `${topOffset + 1}px`,
                        height: `${Math.max(height - 2, 24)}px`,
                        left: `calc(64px + (100% - 64px) * ${colIndex} / ${staff.length} + 3px)`,
                        width: `calc((100% - 64px) / ${staff.length} - 6px)`,
                        backgroundColor: color,
                      }}
                    >
                      <p className="text-xs font-semibold leading-tight truncate">
                        {appt.clients?.first_name} {appt.clients?.last_name}
                      </p>
                      {height > 32 && (
                        <p className="text-[10px] opacity-80 mt-0.5 truncate">{appt.services?.service_name}</p>
                      )}
                    </div>
                  );
                });
              })}

              {/* Unassigned appointments indicator */}
              {appointments.filter((a: any) => !a.staff_id || !staff.find((s: any) => s.id === a.staff_id)).length > 0 && (
                <div className="absolute top-0 right-0 z-20 m-2 bg-destructive/10 text-destructive text-[10px] px-2 py-1 rounded-md font-medium">
                  {appointments.filter((a: any) => !a.staff_id).length} unassigned
                </div>
              )}

              {/* Current time indicator */}
              {currentDate.toDateString() === today.toDateString() && (() => {
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
      )}

      {/* New Booking Dialog */}
      <Dialog open={showNewBooking} onOpenChange={setShowNewBooking}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Select value={newBooking.client_id} onValueChange={(v) => setNewBooking({ ...newBooking, client_id: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service</label>
              <Select value={newBooking.service_id} onValueChange={(v) => setNewBooking({ ...newBooking, service_id: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {services.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.service_name} ({s.duration} min — €{s.price})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select value={newBooking.staff_id} onValueChange={(v) => setNewBooking({ ...newBooking, staff_id: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <Input type="time" value={newBooking.start_time} onChange={(e) => setNewBooking({ ...newBooking, start_time: e.target.value })} className="rounded-xl" />
            </div>
            <Button className="w-full rounded-xl" onClick={handleNewBooking} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
