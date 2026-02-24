import { motion } from "framer-motion";
import { Bell, Gift, Star, MessageSquare, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Trigger {
  id: string;
  title: string;
  description: string;
  icon: typeof Bell;
  enabled: boolean;
  channel: string;
}

const INITIAL_TRIGGERS: Trigger[] = [
  { id: "1", title: "24h Appointment Reminder", description: "Reduce no-shows with automatic reminders sent 24 hours before each appointment.", icon: Bell, enabled: true, channel: "SMS" },
  { id: "2", title: "Post-Service Follow-up", description: "Send a friendly message 48 hours after service: \"Hope you loved your new look!\"", icon: MessageSquare, enabled: true, channel: "Viber" },
  { id: "3", title: "Nameday & Birthday Greetings", description: "Automated greetings with exclusive offer codes on client birthdays and namedays.", icon: Gift, enabled: false, channel: "SMS" },
  { id: "4", title: "Google Review Booster", description: "After checkout, send a direct link to leave a Google Review with one tap.", icon: Star, enabled: true, channel: "SMS" },
];

export default function MarketingPage() {
  const [triggers, setTriggers] = useState(INITIAL_TRIGGERS);

  const toggle = (id: string) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing & Automation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Automated triggers to engage and retain clients</p>
      </div>

      <div className="grid gap-4">
        {triggers.map((trigger, i) => {
          const Icon = trigger.icon;
          return (
            <motion.div
              key={trigger.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "rounded-2xl border bg-card p-5 shadow-apple transition-all",
                trigger.enabled ? "border-border" : "border-border/50 opacity-60"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    trigger.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{trigger.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">{trigger.description}</p>
                    <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {trigger.channel}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggle(trigger.id)}
                  className="shrink-0 mt-1 transition-colors"
                >
                  {trigger.enabled ? (
                    <ToggleRight className="h-8 w-8 text-success" strokeWidth={1.5} />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
