import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, ChevronRight, Calendar, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SERVICES = [
  { id: "1", name: "Haircut & Blowdry", duration: "45 min", price: "€35" },
  { id: "2", name: "Full Color", duration: "90 min", price: "€75" },
  { id: "3", name: "Highlights / Balayage", duration: "120 min", price: "€110" },
  { id: "4", name: "Keratin Treatment", duration: "90 min", price: "€90" },
  { id: "5", name: "Men's Cut", duration: "30 min", price: "€20" },
  { id: "6", name: "Bridal Styling", duration: "120 min", price: "€150" },
];

const TIME_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i + 1);
  return d;
});

type Step = "service" | "date" | "time" | "confirm";

export default function BookingWidget() {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const service = SERVICES.find((s) => s.id === selectedService);

  const steps: Step[] = ["service", "date", "time", "confirm"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Scissors className="h-6 w-6 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Studio Beauty</h1>
          <p className="text-sm text-muted-foreground mt-1">Book your appointment</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "h-2 rounded-full transition-all",
                i <= stepIndex ? "bg-primary w-8" : "bg-border w-2"
              )} />
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-apple-lg overflow-hidden">
          <AnimatePresence mode="wait">
            {step === "service" && (
              <motion.div
                key="service"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-3"
              >
                <h2 className="text-lg font-semibold">Choose a service</h2>
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedService(s.id);
                      setStep("date");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl p-4 text-left transition-all border",
                      selectedService === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.duration}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{s.price}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {step === "date" && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" strokeWidth={1.5} />
                  Pick a date
                </h2>
                <div className="grid grid-cols-4 gap-2">
                  {DATES.map((date) => {
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => {
                          setSelectedDate(date);
                          setStep("time");
                        }}
                        className={cn(
                          "rounded-xl p-3 text-center transition-all border",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/30"
                        )}
                      >
                        <p className="text-xs uppercase">{date.toLocaleDateString("en", { weekday: "short" })}</p>
                        <p className="text-lg font-semibold">{date.getDate()}</p>
                      </button>
                    );
                  })}
                </div>
                <Button variant="outline" className="rounded-xl" onClick={() => setStep("service")}>Back</Button>
              </motion.div>
            )}

            {step === "time" && (
              <motion.div
                key="time"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" strokeWidth={1.5} />
                  Pick a time
                </h2>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => {
                        setSelectedTime(time);
                        setStep("confirm");
                      }}
                      className={cn(
                        "rounded-xl py-2.5 text-sm font-medium border transition-all",
                        selectedTime === time ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/30"
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="rounded-xl" onClick={() => setStep("date")}>Back</Button>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 text-center space-y-4"
              >
                <div className="h-14 w-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <Check className="h-7 w-7 text-success" strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-semibold">Confirm Booking</h2>
                <div className="rounded-xl bg-muted p-4 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Service:</span> <span className="font-medium">{service?.name}</span></p>
                  <p><span className="text-muted-foreground">Date:</span> <span className="font-medium">{selectedDate?.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</span></p>
                  <p><span className="text-muted-foreground">Time:</span> <span className="font-medium">{selectedTime}</span></p>
                  <p><span className="text-muted-foreground">Price:</span> <span className="font-medium">{service?.price}</span></p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" className="rounded-xl" onClick={() => setStep("time")}>Back</Button>
                  <Button className="rounded-xl px-8">Confirm Booking</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
