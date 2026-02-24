import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9);

const today = new Date();
const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(today);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({ client_id: "", service_id: "", start_time: "" });
  const [saving, setSaving] = useState(false);

  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);

  const fetchData = async () => {
    setLoading(true);
    const [apptRes, svcRes, clientRes] = await Promise.all([
      supabase.from("appointments").select("*, clients(first_name, last_name), services(service_name, duration, category_color)").gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString()).order("start_time"),
      supabase.from("services").select("*").order("service_name"),
      supabase.from("clients").select("id, first_name, last_name").order("first_name"),
    ]);
    setAppointments(apptRes.data || []);
    setServices(svcRes.data || []);
    setClients(clientRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate.toDateString()]);

  const goDay = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir);
    setCurrentDate(d);
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
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Booking created");
      setShowNewBooking(false);
      setNewBooking({ client_id: "", service_id: "", start_time: "" });
      fetchData();
    }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
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
          <Button className="rounded-xl ml-2 gap-2" onClick={() => setShowNewBooking(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New Booking
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden">
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="grid border-b border-border/50 last:border-b-0" style={{ gridTemplateColumns: "64px 1fr", height: "72px" }}>
                <div className="flex items-start justify-end pr-3 pt-2 text-xs text-muted-foreground border-r border-border">
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                </div>
                <div className="relative" />
              </div>
            ))}

            {appointments.map((appt: any) => {
              const start = new Date(appt.start_time);
              const end = new Date(appt.end_time);
              const top = (start.getHours() + start.getMinutes() / 60 - 9) * 72;
              const height = ((end.getTime() - start.getTime()) / 3600000) * 72 - 4;
              const color = appt.services?.category_color || "#000";

              return (
                <div
                  key={appt.id}
                  className="absolute rounded-xl p-2.5 cursor-pointer transition-shadow hover:shadow-apple-lg text-white"
                  style={{
                    top: `${top + 2}px`,
                    height: `${Math.max(height, 28)}px`,
                    left: "72px",
                    right: "8px",
                    backgroundColor: color,
                  }}
                >
                  <p className="text-xs font-semibold leading-tight">
                    {appt.clients?.first_name} {appt.clients?.last_name}
                  </p>
                  <p className="text-[10px] opacity-80 mt-0.5">{appt.services?.service_name}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {appointments.length === 0 && !loading && (
        <p className="text-center text-sm text-muted-foreground py-8">No appointments for this day.</p>
      )}

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
