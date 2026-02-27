import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Phone, Mail, ChevronRight, Loader2, CalendarDays, DollarSign, UserX, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_mobile: "", email: "", tech_notes: "", personal_preferences: "" });
  const [clientAppointments, setClientAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("first_name");
    setClients(data || []);
    if (data && data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  // Fetch appointments for selected client
  useEffect(() => {
    if (!selected) return;
    const fetchAppts = async () => {
      setLoadingAppts(true);
      const { data } = await supabase
        .from("appointments")
        .select("id, start_time, end_time, status, is_paid, services(price, service_name)")
        .eq("client_id", selected.id)
        .order("start_time", { ascending: false });
      setClientAppointments(data || []);
      setLoadingAppts(false);
    };
    fetchAppts();
  }, [selected?.id]);

  const filtered = clients.filter((c) =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const analytics = useMemo(() => {
    if (!clientAppointments.length) return { totalAppts: 0, revenue: 0, lastVisitDays: null as number | null, noShows: 0 };
    const now = new Date();

    // Total appointments: exclude cancelled, include no-shows
    const validAppts = clientAppointments.filter((a) => a.status !== "Cancelled");
    const noShows = validAppts.filter((a) => a.status === "No-Show").length;

    // Revenue: price of completed OR (past end_time AND not no-show/cancelled)
    const revenue = clientAppointments.reduce((sum, a) => {
      if (a.status === "Cancelled" || a.status === "No-Show") return sum;
      const endTime = new Date(a.end_time);
      if (a.status === "Completed" || endTime < now) {
        return sum + (a.services?.price || 0);
      }
      return sum;
    }, 0);

    // Last visit: most recent past appointment that's not cancelled/no-show
    const pastVisits = clientAppointments.filter((a) => {
      if (a.status === "Cancelled" || a.status === "No-Show") return false;
      return new Date(a.end_time) < now;
    });
    let lastVisitDays: number | null = null;
    if (pastVisits.length > 0) {
      const lastDate = new Date(pastVisits[0].end_time);
      lastVisitDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return { totalAppts: validAppts.length, revenue, lastVisitDays, noShows };
  }, [clientAppointments]);

  const handleAdd = async () => {
    if (!form.first_name || !form.last_name || !form.phone_mobile) {
      toast.error("Name and phone are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("clients").insert(form);
    if (error) toast.error(error.message);
    else {
      toast.success("Client added");
      setShowAdd(false);
      setForm({ first_name: "", last_name: "", phone_mobile: "", email: "", tech_notes: "", personal_preferences: "" });
      fetchClients();
    }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Button className="rounded-xl gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Client
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
          <div className="w-80 shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-border" />
            </div>
            <div className="space-y-1">
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No clients found.</p>}
              {filtered.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelected(client)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl p-3 text-left transition-all",
                    selected?.id === client.id ? "bg-primary text-primary-foreground shadow-apple" : "hover:bg-accent"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{client.first_name} {client.last_name}</p>
                    <p className={cn("text-xs mt-0.5", selected?.id === client.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {client.phone_mobile}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-40" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="flex-1 rounded-2xl border border-border bg-card shadow-apple p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selected.first_name} {selected.last_name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" strokeWidth={1.5} />{selected.phone_mobile}</span>
                    {selected.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" strokeWidth={1.5} />{selected.email}</span>}
                  </div>
                </div>
              </div>

              {/* Analytics Header */}
              {loadingAppts ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-xs font-medium uppercase tracking-wide">Appointments</span>
                    </div>
                    <p className="text-2xl font-bold">{analytics.totalAppts}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-xs font-medium uppercase tracking-wide">Revenue (LTV)</span>
                    </div>
                    <p className="text-2xl font-bold">€{analytics.revenue.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-xs font-medium uppercase tracking-wide">Last Visit</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {analytics.lastVisitDays !== null ? (
                        <span className={analytics.lastVisitDays > 30 ? "text-destructive" : ""}>
                          {analytics.lastVisitDays === 0 ? "Today" : `${analytics.lastVisitDays}d ago`}
                        </span>
                      ) : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserX className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-xs font-medium uppercase tracking-wide">No-Shows</span>
                    </div>
                    <p className="text-2xl font-bold">{analytics.noShows}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Technical Notes</h3>
                  <div className="rounded-xl bg-muted p-3 text-sm whitespace-pre-wrap">
                    {selected.tech_notes || "No notes yet."}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preferences</h3>
                  <div className="rounded-xl bg-muted p-3 text-sm whitespace-pre-wrap">
                    {selected.personal_preferences || "No preferences yet."}
                  </div>
                </div>
              </div>

              {selected.birthday && (
                <p className="text-sm text-muted-foreground">🎂 Birthday: {new Date(selected.birthday).toLocaleDateString()}</p>
              )}

              {/* Recent Appointments Table */}
              {clientAppointments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Appointments</h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Service</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientAppointments.slice(0, 10).map((appt) => (
                          <tr key={appt.id} className="border-b last:border-0">
                            <td className="px-4 py-2">{new Date(appt.start_time).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{appt.services?.service_name || "—"}</td>
                            <td className="px-4 py-2">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                appt.status === "No-Show" ? "bg-destructive/10 text-destructive" :
                                appt.status === "Cancelled" ? "bg-muted text-muted-foreground" :
                                "bg-primary/10 text-primary"
                              )}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right">€{(appt.services?.price || 0).toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">First Name *</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Last Name *</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone *</label>
              <Input value={form.phone_mobile} onChange={(e) => setForm({ ...form, phone_mobile: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Technical Notes</label>
              <Textarea value={form.tech_notes} onChange={(e) => setForm({ ...form, tech_notes: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Preferences</label>
              <Textarea value={form.personal_preferences} onChange={(e) => setForm({ ...form, personal_preferences: e.target.value })} className="rounded-xl" />
            </div>
            <Button className="w-full rounded-xl" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
