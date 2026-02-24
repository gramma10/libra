import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Phone, Mail, Camera, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  totalVisits: number;
  notes: string;
  technicalHistory: string[];
  preferences: string[];
}

const MOCK_CLIENTS: Client[] = [
  {
    id: "1", name: "Anna Mavridou", phone: "+30 694 123 4567", email: "anna@email.com",
    lastVisit: "Feb 18, 2026", totalVisits: 24, notes: "Prefers cappuccino, sensitive scalp",
    technicalHistory: ["7.1 Ash Blonde + 20vol (Nov)", "Keratin smoothing (Sep)", "6.0 Natural + 30vol (Jul)"],
    preferences: ["Cappuccino with oat milk", "Sensitive scalp — no ammonia", "Prefers morning slots"],
  },
  {
    id: "2", name: "George Laskaris", phone: "+30 697 555 1234", email: "george.l@email.com",
    lastVisit: "Feb 20, 2026", totalVisits: 12, notes: "Classic cut, no product",
    technicalHistory: ["Classic scissor cut #2 sides (Feb)", "Beard trim + shape (Jan)"],
    preferences: ["No styling product", "Quiet — prefers no small talk"],
  },
  {
    id: "3", name: "Eleni Konstantinou", phone: "+30 698 222 9876", email: "eleni.k@email.com",
    lastVisit: "Feb 15, 2026", totalVisits: 31, notes: "VIP client, always books double slot",
    technicalHistory: ["9.13 Very Light Beige + Olaplex (Feb)", "Balayage 8.0 → 10.1 (Dec)", "Trim + deep conditioning (Nov)"],
    preferences: ["Green tea", "Double slot always", "Birthday: March 12"],
  },
  {
    id: "4", name: "Dimitra Papadaki", phone: "+30 693 444 5678", email: "dimitra@email.com",
    lastVisit: "Feb 10, 2026", totalVisits: 8, notes: "New client, referred by Eleni",
    technicalHistory: ["5.0 + 6.34 warm brunette (Feb)", "Cut — long layers (Jan)"],
    preferences: ["No coffee", "Allergic to parabens"],
  },
];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(MOCK_CLIENTS[0]);

  const filtered = MOCK_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Client
        </Button>
      </div>

      <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
        {/* Client List */}
        <div className="w-80 shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-border"
            />
          </div>
          <div className="space-y-1">
            {filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelected(client)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl p-3 text-left transition-all",
                  selected?.id === client.id
                    ? "bg-primary text-primary-foreground shadow-apple"
                    : "hover:bg-accent"
                )}
              >
                <div>
                  <p className="text-sm font-medium">{client.name}</p>
                  <p className={cn("text-xs mt-0.5", selected?.id === client.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    Last visit: {client.lastVisit}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 opacity-40" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Client Detail */}
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 rounded-2xl border border-border bg-card shadow-apple p-6 space-y-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selected.name}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" strokeWidth={1.5} />{selected.phone}</span>
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" strokeWidth={1.5} />{selected.email}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold">{selected.totalVisits}</p>
                <p className="text-xs text-muted-foreground">Total visits</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Technical History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Technical History</h3>
                <div className="space-y-2">
                  {selected.technicalHistory.map((entry, i) => (
                    <div key={i} className="rounded-xl bg-muted p-3 text-sm">{entry}</div>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preferences & Notes</h3>
                <div className="space-y-2">
                  {selected.preferences.map((pref, i) => (
                    <div key={i} className="rounded-xl bg-muted p-3 text-sm">{pref}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Media Gallery */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Before & After Gallery</h3>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-muted flex items-center justify-center">
                    <Camera className="h-6 w-6 text-muted-foreground/40" strokeWidth={1.5} />
                  </div>
                ))}
                <button className="aspect-square rounded-2xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
