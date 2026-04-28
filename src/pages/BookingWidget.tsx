import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, ChevronRight, Calendar, Clock, Check, Loader2, User, Users, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBookingTheme } from "@/hooks/useBookingTheme";
import { DEFAULT_THEME, type ThemeSettings } from "@/components/settings/ThemePresets";
import { hexToHSL, isLightColor, adjustHex } from "@/lib/color-utils";
interface DayHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

const DAY_MAP: Record<number, string> = {
  0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
  4: "Thursday", 5: "Friday", 6: "Saturday",
};

const MAX_BOOKING_DAYS = 30;

const ANYONE_STAFF = { id: "anyone", first_name: "Anyone", last_name: "", role: "No Preference" };

/** Format a local Date as YYYY-MM-DD using local components (avoids UTC shift from toISOString) */
const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type Step = "service" | "barber" | "date" | "time" | "info" | "confirm";

export default function BookingWidget() {
  const { slug } = useParams<{ slug: string }>();
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState({ first_name: "", last_name: "", phone_mobile: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<{ start: Date; end: Date; staffId: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState<string | null>(null);
  const [phoneLookupDone, setPhoneLookupDone] = useState(false);
  const [lookingUpPhone, setLookingUpPhone] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [shopName, setShopName] = useState("");
  const [operatingHours, setOperatingHours] = useState<DayHours[]>([]);

  const { theme, loaded: themeLoaded } = useBookingTheme(shopId);

  // Generate time slots from operating hours for a given date
  const getTimeSlotsForDate = (date: Date): string[] => {
    const dayName = DAY_MAP[date.getDay()];
    const dayHours = operatingHours.find((h) => h.day === dayName);
    if (!dayHours || dayHours.isClosed) return [];

    const slots: string[] = [];
    const [openH, openM] = dayHours.open.split(":").map(Number);
    const [closeH, closeM] = dayHours.close.split(":").map(Number);
    const startMin = openH * 60 + openM;
    const endMin = closeH * 60 + closeM;

    for (let m = startMin; m < endMin; m += 15) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }
    return slots;
  };

  // Check if a date is a closed day
  const isDayClosed = (date: Date): boolean => {
    if (operatingHours.length === 0) return false;
    const dayName = DAY_MAP[date.getDay()];
    const dayHours = operatingHours.find((h) => h.day === dayName);
    return !dayHours || dayHours.isClosed;
  };

  // Generate available dates (skip closed days)
  const availableDates = (() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= MAX_BOOKING_DAYS; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      if (!isDayClosed(d)) dates.push(d);
    }
    return dates;
  })();

  useEffect(() => {
    const init = async () => {
      // Resolve shop_id + slug from URL slug or fall back to first available
      let resolvedShopId: string | null = null;
      let resolvedSlug: string | null = null;
      if (slug) {
        const { data: shop } = await supabase.from("shops").select("id, slug").eq("slug", slug).maybeSingle();
        resolvedShopId = shop?.id || null;
        resolvedSlug = shop?.slug || null;
      }
      if (!resolvedShopId) {
        const { data: shop } = await supabase.from("shops").select("id, slug").limit(1).single();
        resolvedShopId = shop?.id || null;
        resolvedSlug = shop?.slug || null;
      }
      setShopId(resolvedShopId);
      setShopSlug(resolvedSlug);

      const filter = resolvedShopId ? { shop_id: resolvedShopId } : {};
      const [svcRes, staffRes, settingsRes] = await Promise.all([
        supabase.from("services").select("*").match(filter).order("service_name"),
        supabase.from("staff").select("*").match(filter).eq("is_active", true).order("first_name"),
        supabase.from("business_settings").select("logo_url, shop_name, operating_hours").match(filter).limit(1).single(),
      ]);
      setServices(svcRes.data || []);
      setStaffList(staffRes.data || []);
      if (settingsRes.data) {
        setLogoUrl(settingsRes.data.logo_url || "");
        setShopName(settingsRes.data.shop_name || "");
        if (settingsRes.data.operating_hours) {
          setOperatingHours(settingsRes.data.operating_hours as unknown as DayHours[]);
        }
      }
      setLoading(false);
    };
    init();
  }, [slug]);

  const normalizePhone = (raw: string) => {
    let p = raw.replace(/[\s\-()]/g, "");
    if (p.startsWith("+30")) p = p.slice(3);
    else if (p.startsWith("0030")) p = p.slice(4);
    else if (p.startsWith("30") && p.length === 12) p = p.slice(2);
    return p;
  };

  useEffect(() => {
    const normalized = normalizePhone(clientInfo.phone_mobile);
    if (normalized.length < 5 || !shopSlug) { setPhoneLookupDone(false); setClientFound(false); return; }
    const timer = setTimeout(async () => {
      setLookingUpPhone(true);
      const { data } = await supabase.rpc("public_lookup_client", {
        _shop_slug: shopSlug,
        _phone: clientInfo.phone_mobile,
        _phone_normalized: normalized,
      });
      const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (found) {
        setClientInfo((prev) => ({
          ...prev,
          first_name: found.first_name || prev.first_name,
          last_name: found.last_name || prev.last_name,
          email: found.email || prev.email,
        }));
        setClientFound(true);
      } else {
        setClientFound(false);
      }
      setPhoneLookupDone(true);
      setLookingUpPhone(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [clientInfo.phone_mobile, shopSlug]);

  useEffect(() => {
    if (!selectedDate || !selectedStaff || !shopSlug) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      const dateStr = formatLocalDate(selectedDate);
      const { data } = await supabase.rpc("public_get_booked_slots", {
        _shop_slug: shopSlug,
        _date: dateStr,
      });
      const all = (data || []) as Array<{ start_time: string; end_time: string; staff_id: string | null }>;
      const filtered = selectedStaff.id !== "anyone"
        ? all.filter((a) => a.staff_id === selectedStaff.id)
        : all;
      setBookedSlots(filtered.map((a) => ({
        start: new Date(a.start_time),
        end: new Date(a.end_time),
        staffId: a.staff_id as any,
      })));
      setLoadingSlots(false);
    };
    fetchSlots();
  }, [selectedDate, selectedStaff, shopSlug]);

  const isSlotAvailable = (time: string): boolean => {
    if (!selectedDate || !selectedService) return true;
    const slotStart = new Date(`${formatLocalDate(selectedDate)}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + selectedService.duration * 60000);

    if (selectedStaff?.id === "anyone") {
      return staffList.some((staff) => {
        const staffSlots = bookedSlots.filter((b) => b.staffId === staff.id);
        return !staffSlots.some((b) => slotStart < b.end && slotEnd > b.start);
      });
    }
    return !bookedSlots.some((b) => slotStart < b.end && slotEnd > b.start);
  };

  const findAvailableStaff = (time: string): any | null => {
    if (!selectedDate || !selectedService) return null;
    const slotStart = new Date(`${formatLocalDate(selectedDate)}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + selectedService.duration * 60000);
    for (const staff of staffList) {
      const staffSlots = bookedSlots.filter((b) => b.staffId === staff.id);
      if (!staffSlots.some((b) => slotStart < b.end && slotEnd > b.start)) return staff;
    }
    return null;
  };

  const steps: Step[] = ["service", "barber", "date", "time", "info", "confirm"];
  const stepIndex = steps.indexOf(step);

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedStaff?.id === "anyone") {
      const available = findAvailableStaff(time);
      setAssignedStaffId(available?.id || null);
    } else {
      setAssignedStaffId(selectedStaff?.id || null);
    }
    setStep("info");
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientInfo.first_name || !clientInfo.phone_mobile || !clientInfo.email) return;
    const staffIdToUse = assignedStaffId;
    setSubmitting(true);

    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + MAX_BOOKING_DAYS);
    maxDate.setHours(23, 59, 59, 999);
    if (selectedDate > maxDate) {
      toast.error("You can only book up to 30 days in advance.");
      setSubmitting(false);
      return;
    }

    const startDt = new Date(`${formatLocalDate(selectedDate)}T${selectedTime}:00`);
    const endDt = new Date(startDt.getTime() + selectedService.duration * 60000);

    if (!shopSlug) {
      toast.error("Shop not found");
      setSubmitting(false);
      return;
    }

    const normalizedPhone = normalizePhone(clientInfo.phone_mobile);

    // Atomic create: server validates shop, service, and staff scope; exclusion
    // constraint guarantees no double-booking.
    const { data: rpcData, error: rpcError } = await supabase.rpc("public_create_booking", {
      _shop_slug: shopSlug,
      _service_id: selectedService.id,
      _staff_id: staffIdToUse || null,
      _start_time: startDt.toISOString(),
      _end_time: endDt.toISOString(),
      _first_name: clientInfo.first_name,
      _last_name: clientInfo.last_name || "",
      _email: clientInfo.email,
      _phone: clientInfo.phone_mobile,
      _phone_normalized: normalizedPhone || clientInfo.phone_mobile,
    });

    if (rpcError) {
      const { bookingErrorMessage } = await import("@/lib/booking-errors");
      toast.error(bookingErrorMessage(rpcError, rpcError.message));
      setSubmitting(false);
      return;
    }

    const created = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;
    toast.success("Booking confirmed!");
    setStep("confirm");

    // Fire-and-forget email confirmation
    if (created?.appointment_id) {
      supabase.functions
        .invoke("send-appointment-email", {
          body: {
            record: {
              id: created.appointment_id,
              client_id: created.client_id,
              shop_id: created.shop_id,
              service_id: selectedService.id,
              staff_id: staffIdToUse || null,
              start_time: startDt.toISOString(),
              end_time: endDt.toISOString(),
            },
          },
        })
        .then(({ error: invokeError }) => {
          if (invokeError) {
            console.error("Email invocation failed:", invokeError);
          }
        });
    }
    setSubmitting(false);
  };

  const getConfirmStaffName = () => {
    if (selectedStaff?.id === "anyone") {
      const staff = staffList.find((s) => s.id === assignedStaffId);
      return staff ? `${staff.first_name} ${staff.last_name}` : "Any Available";
    }
    return `${selectedStaff?.first_name} ${selectedStaff?.last_name}`;
  };

  const resetBooking = () => {
    setStep("service"); setSelectedService(null); setSelectedStaff(null);
    setSelectedDate(null); setSelectedTime(null); setAssignedStaffId(null);
    setClientInfo({ first_name: "", last_name: "", phone_mobile: "", email: "" });
    setPhoneLookupDone(false); setClientFound(false);
  };

  // Derive shadcn-compatible CSS variable overrides from the theme
  const themeVars = useMemo(() => {
    const bgLight = isLightColor(theme.background_color);
    const cardColor = bgLight ? adjustHex(theme.background_color, -0.03) : adjustHex(theme.background_color, 0.08);
    const mutedColor = bgLight ? adjustHex(theme.background_color, -0.06) : adjustHex(theme.background_color, 0.12);
    const borderColor = bgLight ? adjustHex(theme.background_color, -0.12) : adjustHex(theme.background_color, 0.18);
    const mutedFg = bgLight ? adjustHex(theme.text_color, 0.4) : adjustHex(theme.text_color, -0.3);
    const primaryFg = isLightColor(theme.primary_color) ? "0 0% 10%" : "0 0% 100%";

    return {
      "--background": hexToHSL(theme.background_color),
      "--foreground": hexToHSL(theme.text_color),
      "--primary": hexToHSL(theme.primary_color),
      "--primary-foreground": primaryFg,
      "--card": hexToHSL(cardColor),
      "--card-foreground": hexToHSL(theme.text_color),
      "--muted": hexToHSL(mutedColor),
      "--muted-foreground": hexToHSL(mutedFg),
      "--border": hexToHSL(borderColor),
      "--input": hexToHSL(borderColor),
      "--ring": hexToHSL(theme.primary_color),
      "--accent": hexToHSL(mutedColor),
      "--accent-foreground": hexToHSL(theme.text_color),
      "--radius": theme.border_radius,
      fontFamily: theme.font_family,
    } as React.CSSProperties;
  }, [theme]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const timeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground"
      style={themeVars}
    >
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-14 w-14 mx-auto rounded-2xl object-cover mb-4" />
          ) : (
            <div className="h-14 w-14 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4">
              <Scissors className="h-6 w-6 text-primary-foreground" strokeWidth={1.5} />
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{shopName || "Book an Appointment"}</h1>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={cn("h-2 rounded-full transition-all", i <= stepIndex ? "w-8 bg-primary" : "bg-border w-2")} />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-apple-lg overflow-hidden text-card-foreground">
          <AnimatePresence mode="wait">
            {step === "service" && (
              <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-3">
                <h2 className="text-lg font-semibold">Choose a service</h2>
                {services.length === 0 && <p className="text-sm text-muted-foreground">No services available.</p>}
                {services.map((s: any) => (
                  <button key={s.id} onClick={() => { setSelectedService(s); setStep("barber"); }}
                    className="flex w-full items-center justify-between rounded-xl p-4 text-left transition-all border border-border hover:border-primary/30">
                    <div>
                      <p className="text-sm font-medium">{s.service_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.duration} min</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">€{Number(s.price).toFixed(0)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {step === "barber" && (
              <motion.div key="barber" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><User className="h-5 w-5" strokeWidth={1.5} />Choose a Professional</h2>
                <button onClick={() => { setSelectedStaff(ANYONE_STAFF); setStep("date"); }}
                  className="flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all border-2 border-primary/20 bg-primary/5 hover:border-primary/50">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">No Preference</p>
                    <p className="text-xs text-muted-foreground">First available professional</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  {staffList.map((s: any) => (
                    <button key={s.id} onClick={() => { setSelectedStaff(s); setStep("date"); }}
                      className="rounded-xl p-4 text-center transition-all border border-border hover:border-primary/30">
                      <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <User className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.role}</p>
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="rounded-xl" onClick={() => setStep("service")}>Back</Button>
              </motion.div>
            )}

            {step === "date" && (
              <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="h-5 w-5" strokeWidth={1.5} />Pick a date</h2>
                <p className="text-xs text-muted-foreground">You can book up to {MAX_BOOKING_DAYS} days in advance.</p>
                {availableDates.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No available dates in the next {MAX_BOOKING_DAYS} days.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
                    {availableDates.map((date) => (
                      <button key={date.toISOString()} onClick={() => { setSelectedDate(date); setStep("time"); }}
                        className="rounded-xl p-3 text-center transition-all border border-border hover:border-primary/30">
                        <p className="text-xs uppercase">{date.toLocaleDateString("en", { weekday: "short" })}</p>
                        <p className="text-lg font-semibold">{date.getDate()}</p>
                        <p className="text-[10px] text-muted-foreground">{date.toLocaleDateString("en", { month: "short" })}</p>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="rounded-xl" onClick={() => setStep("barber")}>Back</Button>
              </motion.div>
            )}

            {step === "time" && (
              <motion.div key="time" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5" strokeWidth={1.5} />Pick a time</h2>
                {loadingSlots ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No time slots available for this day.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((time) => {
                      const available = isSlotAvailable(time);
                      return (
                        <button key={time} onClick={() => { if (available) handleTimeSelect(time); }}
                          disabled={!available}
                          className={cn(
                            "rounded-xl py-2.5 text-sm font-medium border transition-all",
                            available ? "border-border hover:border-primary/30 cursor-pointer" : "border-border/50 bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                          )}>
                          {available ? time : "Booked"}
                        </button>
                      );
                    })}
                  </div>
                )}
                <Button variant="outline" className="rounded-xl" onClick={() => setStep("date")}>Back</Button>
              </motion.div>
            )}

            {step === "info" && (
              <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Your details</h2>
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Phone *</label>
                  <Input value={clientInfo.phone_mobile} onChange={(e) => setClientInfo({ ...clientInfo, phone_mobile: e.target.value })} className="rounded-xl" placeholder="Enter your phone number..." />
                  {lookingUpPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Looking up...</p>}
                  {phoneLookupDone && clientFound && <p className="text-xs text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Welcome back! Your details have been filled in.</p>}
                  {phoneLookupDone && !clientFound && clientInfo.phone_mobile.length >= 5 && <p className="text-xs text-muted-foreground">New customer — please fill in your details below.</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">First Name *</label>
                    <Input value={clientInfo.first_name} onChange={(e) => setClientInfo({ ...clientInfo, first_name: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input value={clientInfo.last_name} onChange={(e) => setClientInfo({ ...clientInfo, last_name: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email *</label>
                  <Input type="email" value={clientInfo.email} onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })} className="rounded-xl" placeholder="your@email.com" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="rounded-xl" onClick={() => setStep("time")}>Back</Button>
                  <Button className="rounded-xl flex-1" onClick={handleConfirm} disabled={submitting || !clientInfo.first_name || !clientInfo.phone_mobile || !clientInfo.email}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Booking"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div key="confirm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="p-6 text-center space-y-4">
                <div className="h-14 w-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <Check className="h-7 w-7 text-success" strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-semibold">Booking Confirmed!</h2>
                <div className="rounded-xl bg-muted p-4 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Service:</span> <span className="font-medium">{selectedService?.service_name}</span></p>
                  <p><span className="text-muted-foreground">Professional:</span> <span className="font-medium">{getConfirmStaffName()}</span></p>
                  <p><span className="text-muted-foreground">Date:</span> <span className="font-medium">{selectedDate?.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</span></p>
                  <p><span className="text-muted-foreground">Time:</span> <span className="font-medium">{selectedTime}</span></p>
                </div>
                <Button className="rounded-xl px-8" onClick={resetBooking}>Book Another</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
