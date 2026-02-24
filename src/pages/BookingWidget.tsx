import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, ChevronRight, Calendar, Clock, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIME_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i + 1);
  return d;
});

type Step = "service" | "date" | "time" | "info" | "confirm";

export default function BookingWidget() {
  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState({ first_name: "", last_name: "", phone_mobile: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("services").select("*").order("service_name").then(({ data }) => {
      setServices(data || []);
      setLoading(false);
    });
  }, []);

  const steps: Step[] = ["service", "date", "time", "info", "confirm"];
  const stepIndex = steps.indexOf(step);

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientInfo.first_name || !clientInfo.phone_mobile) return;
    setSubmitting(true);

    // Find or create client
    let clientId: string;
    const { data: existing } = await supabase.from("clients").select("id").eq("phone_mobile", clientInfo.phone_mobile).limit(1).single();

    if (existing) {
      clientId = existing.id;
    } else {
      const { data: newClient, error } = await supabase.from("clients").insert({
        first_name: clientInfo.first_name,
        last_name: clientInfo.last_name,
        phone_mobile: clientInfo.phone_mobile,
      }).select("id").single();
      if (error || !newClient) {
        toast.error("Could not create client");
        setSubmitting(false);
        return;
      }
      clientId = newClient.id;
    }

    const startDt = new Date(`${selectedDate.toISOString().split("T")[0]}T${selectedTime}:00`);
    const endDt = new Date(startDt.getTime() + selectedService.duration * 60000);

    const { error } = await supabase.from("appointments").insert({
      client_id: clientId,
      service_id: selectedService.id,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Booking confirmed!");
      setStep("confirm");
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Scissors className="h-6 w-6 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Book an Appointment</h1>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={cn("h-2 rounded-full transition-all", i <= stepIndex ? "bg-primary w-8" : "bg-border w-2")} />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-apple-lg overflow-hidden">
          <AnimatePresence mode="wait">
            {step === "service" && (
              <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-3">
                <h2 className="text-lg font-semibold">Choose a service</h2>
                {services.length === 0 && <p className="text-sm text-muted-foreground">No services available.</p>}
                {services.map((s: any) => (
                  <button key={s.id} onClick={() => { setSelectedService(s); setStep("date"); }}
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

            {step === "date" && (
              <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="h-5 w-5" strokeWidth={1.5} />Pick a date</h2>
                <div className="grid grid-cols-4 gap-2">
                  {DATES.map((date) => (
                    <button key={date.toISOString()} onClick={() => { setSelectedDate(date); setStep("time"); }}
                      className="rounded-xl p-3 text-center transition-all border border-border hover:border-primary/30">
                      <p className="text-xs uppercase">{date.toLocaleDateString("en", { weekday: "short" })}</p>
                      <p className="text-lg font-semibold">{date.getDate()}</p>
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="rounded-xl" onClick={() => setStep("service")}>Back</Button>
              </motion.div>
            )}

            {step === "time" && (
              <motion.div key="time" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5" strokeWidth={1.5} />Pick a time</h2>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button key={time} onClick={() => { setSelectedTime(time); setStep("info"); }}
                      className="rounded-xl py-2.5 text-sm font-medium border border-border transition-all hover:border-primary/30">{time}</button>
                  ))}
                </div>
                <Button variant="outline" className="rounded-xl" onClick={() => setStep("date")}>Back</Button>
              </motion.div>
            )}

            {step === "info" && (
              <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Your details</h2>
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
                  <label className="text-sm font-medium">Phone *</label>
                  <Input value={clientInfo.phone_mobile} onChange={(e) => setClientInfo({ ...clientInfo, phone_mobile: e.target.value })} className="rounded-xl" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="rounded-xl" onClick={() => setStep("time")}>Back</Button>
                  <Button className="rounded-xl flex-1" onClick={handleConfirm} disabled={submitting || !clientInfo.first_name || !clientInfo.phone_mobile}>
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
                  <p><span className="text-muted-foreground">Date:</span> <span className="font-medium">{selectedDate?.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</span></p>
                  <p><span className="text-muted-foreground">Time:</span> <span className="font-medium">{selectedTime}</span></p>
                </div>
                <Button className="rounded-xl px-8" onClick={() => { setStep("service"); setSelectedService(null); setSelectedDate(null); setSelectedTime(null); }}>
                  Book Another
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
