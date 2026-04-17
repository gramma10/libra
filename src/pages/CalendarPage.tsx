import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import CalendarHeader, { CalendarView } from "@/components/calendar/CalendarHeader";
import DayView from "@/components/calendar/DayView";
import WeekView from "@/components/calendar/WeekView";
import ThreeDayView from "@/components/calendar/ThreeDayView";
import MonthView from "@/components/calendar/MonthView";
import NewBookingDialog from "@/components/calendar/NewBookingDialog";
import EditBookingDialog from "@/components/calendar/EditBookingDialog";
import { useLanguage } from "@/hooks/useLanguage";

const today = new Date();

export default function CalendarPage() {
  const { shopId } = useShop();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(today);
  const [view, setView] = useState<CalendarView>("day");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [prefillStaffId, setPrefillStaffId] = useState("");
  const [prefillTime, setPrefillTime] = useState("");
  const [bookingDate, setBookingDate] = useState(currentDate);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);

  const getDateRange = () => {
    if (view === "day") {
      const start = new Date(currentDate); start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (view === "3day") {
      const start = new Date(currentDate); start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate); end.setDate(end.getDate() + 2); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay() + 1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    // month
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const [apptRes, svcRes, staffRes] = await Promise.all([
      supabase.from("appointments").select("*, clients(first_name, last_name, phone_mobile, email, personal_preferences, tech_notes), services(service_name, duration, category_color)").gte("start_time", start.toISOString()).lte("start_time", end.toISOString()).order("start_time"),
      supabase.from("services").select("*").order("service_name"),
      supabase.from("staff").select("*").eq("is_active", true).order("first_name"),
    ]);
    setAppointments(apptRes.data || []);
    setServices(svcRes.data || []);
    setStaff(staffRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate.toDateString(), view]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "3day") d.setDate(d.getDate() + dir * 3);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const handleCellClick = (staffId: string, hour: number, minutes: number, day?: Date) => {
    const h = hour.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    setPrefillStaffId(staffId);
    setPrefillTime(`${h}:${m}`);
    setBookingDate(day || currentDate);
    setShowNewBooking(true);
  };

  const openNewBooking = () => {
    setPrefillStaffId("");
    setPrefillTime("");
    setBookingDate(currentDate);
    setShowNewBooking(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col h-[calc(100vh-80px)]">
      <CalendarHeader currentDate={currentDate} view={view} onViewChange={setView} onNavigate={navigate} onToday={() => setCurrentDate(today)} onNewBooking={openNewBooking} />

      {loading ? (
        <div className="flex justify-center py-20 flex-1"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : view === "day" ? (
        staff.length === 0 ? (
          <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground text-sm">{t("calendar.addEmployeesFirst")}</p></div>
        ) : (
          <DayView date={currentDate} staff={staff} appointments={appointments} onCellClick={handleCellClick} onAppointmentClick={(appt) => setEditingAppointment(appt)} />
        )
      ) : view === "3day" ? (
        staff.length === 0 ? (
          <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground text-sm">{t("calendar.addEmployeesFirst")}</p></div>
        ) : (
          <ThreeDayView date={currentDate} staff={staff} appointments={appointments} onCellClick={handleCellClick} onAppointmentClick={(appt) => setEditingAppointment(appt)} />
        )
      ) : view === "week" ? (
        <WeekView date={currentDate} appointments={appointments} onCellClick={handleCellClick} onAppointmentClick={(appt) => setEditingAppointment(appt)} />
      ) : (
        <MonthView date={currentDate} appointments={appointments} onDayClick={(day) => { setCurrentDate(day); setView("day"); }} />
      )}

      <NewBookingDialog open={showNewBooking} onOpenChange={setShowNewBooking} currentDate={bookingDate} prefillStaffId={prefillStaffId} prefillTime={prefillTime} services={services} staff={staff} onCreated={fetchData} shopId={shopId || ""} />
      <EditBookingDialog open={!!editingAppointment} onOpenChange={(open) => { if (!open) setEditingAppointment(null); }} appointment={editingAppointment} services={services} staff={staff} onUpdated={fetchData} />
    </motion.div>
  );
}
