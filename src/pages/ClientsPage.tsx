import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Phone, Mail, ChevronRight, Loader2, CalendarDays, DollarSign, UserX, Clock, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import ClientFilters from "@/components/clients/ClientFilters";
import { useLanguage } from "@/hooks/useLanguage";

interface FilterValues {
  search: string;
  lastVisit: string;
  ltvMin: string;
  ltvMax: string;
  serviceId: string;
}

const defaultFilters: FilterValues = {
  search: "",
  lastVisit: "all",
  ltvMin: "",
  ltvMax: "",
  serviceId: "all",
};

export default function ClientsPage() {
  const { shopId } = useShop();
  const { t, locale } = useLanguage();
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_mobile: "", email: "", tech_notes: "", personal_preferences: "" });
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone_mobile: "", email: "", tech_notes: "", personal_preferences: "" });
  const [clientAppointments, setClientAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [services, setServices] = useState<{ id: string; service_name: string }[]>([]);
  const [clientServiceMap, setClientServiceMap] = useState<Record<string, Set<string>>>({});
  const [clientLastVisit, setClientLastVisit] = useState<Record<string, Date>>({});
  const [clientRevenue, setClientRevenue] = useState<Record<string, number>>({});

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("first_name");
    setClients(data || []);
    if (data && data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
    // Fetch services for filter dropdown
    supabase.from("services").select("id, service_name").then(({ data }) => {
      setServices(data || []);
    });
    // Fetch appointment data for filters (service history, last visit, revenue)
    supabase
      .from("appointments")
      .select("client_id, service_id, start_time, end_time, status, services(price)")
      .then(({ data }) => {
        const serviceMap: Record<string, Set<string>> = {};
        const lastVisitMap: Record<string, Date> = {};
        const revenueMap: Record<string, number> = {};
        const now = new Date();

        (data || []).forEach((a: any) => {
          // Service history map
          if (a.service_id) {
            if (!serviceMap[a.client_id]) serviceMap[a.client_id] = new Set();
            serviceMap[a.client_id].add(a.service_id);
          }

          // Skip cancelled/no-show for visit and revenue
          if (a.status === "Cancelled" || a.status === "No-Show") return;

          const endTime = new Date(a.end_time);
          if (endTime > now) return; // future appointment

          // Last visit
          if (!lastVisitMap[a.client_id] || endTime > lastVisitMap[a.client_id]) {
            lastVisitMap[a.client_id] = endTime;
          }

          // Revenue
          revenueMap[a.client_id] = (revenueMap[a.client_id] || 0) + (a.services?.price || 0);
        });

        setClientServiceMap(serviceMap);
        setClientLastVisit(lastVisitMap);
        setClientRevenue(revenueMap);
      });
  }, []);

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

  const filtered = useMemo(() => {
    const now = new Date();
    return clients.filter((c) => {
      // Search by name, phone, email
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
          || (c.phone_mobile || "").toLowerCase().includes(q)
          || (c.email || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // Last visit filter (use computed data from appointments)
      const lastVisitDate = clientLastVisit[c.id];
      if (filters.lastVisit !== "all") {
        if (!lastVisitDate) {
          // No visit recorded - include in "90+" (inactive), exclude from recent filters
          if (filters.lastVisit !== "90+") return false;
        } else {
          const daysSince = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
          if (filters.lastVisit === "30" && daysSince > 30) return false;
          if (filters.lastVisit === "60" && daysSince > 60) return false;
          if (filters.lastVisit === "90+" && daysSince < 90) return false;
        }
      }

      // LTV filter (use computed revenue from appointments)
      const spent = clientRevenue[c.id] || 0;
      if (filters.ltvMin && spent < Number(filters.ltvMin)) return false;
      if (filters.ltvMax && spent > Number(filters.ltvMax)) return false;

      // Service history filter
      if (filters.serviceId !== "all") {
        const clientServices = clientServiceMap[c.id];
        if (!clientServices || !clientServices.has(filters.serviceId)) return false;
      }

      return true;
    });
  }, [clients, filters, clientServiceMap, clientLastVisit, clientRevenue]);

  // Reset selected client when it's no longer in the filtered list
  useEffect(() => {
    if (filtered.length === 0) {
      setSelected(null);
    } else if (selected && !filtered.find((c) => c.id === selected.id)) {
      setSelected(filtered[0]);
    }
  }, [filtered]);

  const analytics = useMemo(() => {
    if (!clientAppointments.length) return { totalAppts: 0, revenue: 0, lastVisitDays: null as number | null, noShows: 0 };
    const now = new Date();
    const validAppts = clientAppointments.filter((a) => a.status !== "Cancelled");
    const noShows = validAppts.filter((a) => a.status === "No-Show").length;
    const revenue = clientAppointments.reduce((sum, a) => {
      if (a.status === "Cancelled" || a.status === "No-Show") return sum;
      const endTime = new Date(a.end_time);
      if (a.status === "Completed" || endTime < now) return sum + (a.services?.price || 0);
      return sum;
    }, 0);
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
    const { error } = await supabase.from("clients").insert({ ...form, shop_id: shopId! });
    if (error) toast.error(error.message);
    else {
      toast.success("Client added");
      setShowAdd(false);
      setForm({ first_name: "", last_name: "", phone_mobile: "", email: "", tech_notes: "", personal_preferences: "" });
      fetchClients();
    }
    setSaving(false);
  };

  const openEdit = () => {
    if (!selected) return;
    setEditForm({
      first_name: selected.first_name,
      last_name: selected.last_name,
      phone_mobile: selected.phone_mobile,
      email: selected.email || "",
      tech_notes: selected.tech_notes || "",
      personal_preferences: selected.personal_preferences || "",
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!editForm.first_name || !editForm.last_name || !editForm.phone_mobile) {
      toast.error(t("clients.namePhoneRequired"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("clients").update(editForm).eq("id", selected.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("clients.updated"));
      setShowEdit(false);
      const updatedClient = { ...selected, ...editForm };
      setSelected(updatedClient);
      fetchClients();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from("clients").delete().eq("id", selected.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("clients.deleted"));
      setShowDelete(false);
      setSelected(null);
      fetchClients();
    }
    setSaving(false);
  };

  const handleExportCSV = useCallback(() => {
    if (filtered.length === 0) {
      toast.error("No clients to export");
      return;
    }
    const escape = (val: string) => {
      if (!val) return "";
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const header = "Full Name,Phone,Email,Last Visit,Total Revenue,Preferences/Notes";
    const rows = filtered.map((c) => {
      const name = `${c.first_name} ${c.last_name}`;
      const lastVisit = c.last_visit ? new Date(c.last_visit).toLocaleDateString() : "";
      const revenue = `€${(Number(c.total_spent) || 0).toFixed(0)}`;
      const notes = [c.personal_preferences, c.tech_notes].filter(Boolean).join(" | ");
      return [name, c.phone_mobile, c.email || "", lastVisit, revenue, notes].map(escape).join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} clients`);
  }, [filtered]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Clients</h1>
        <Button className="rounded-xl gap-2 shrink-0" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Add Client</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 min-h-[calc(100vh-12rem)]">
          <div className="w-full md:w-80 shrink-0 space-y-3">
            <ClientFilters
              filters={filters}
              onFilterChange={setFilters}
              services={services}
              onExport={handleExportCSV}
              filteredCount={filtered.length}
              totalCount={clients.length}
            />
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
            <motion.div key={selected.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="flex-1 rounded-2xl border border-border bg-card shadow-apple p-4 md:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold">{selected.first_name} {selected.last_name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" strokeWidth={1.5} />{selected.phone_mobile}</span>
                    {selected.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" strokeWidth={1.5} />{selected.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={openEdit}>
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="hidden sm:inline">{t("clients.editClient")}</span>
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" onClick={() => setShowDelete(true)}>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="hidden sm:inline">{t("clients.deleteClient")}</span>
                  </Button>
                </div>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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

      {/* Edit Client Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{t("clients.editClient")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("clients.firstName")} *</label>
                <Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("clients.lastName")} *</label>
                <Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("clients.phone")} *</label>
              <Input value={editForm.phone_mobile} onChange={(e) => setEditForm({ ...editForm, phone_mobile: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("clients.emailLabel")}</label>
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("clients.techNotesLabel")}</label>
              <Textarea value={editForm.tech_notes} onChange={(e) => setEditForm({ ...editForm, tech_notes: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("clients.preferencesLabel")}</label>
              <Textarea value={editForm.personal_preferences} onChange={(e) => setEditForm({ ...editForm, personal_preferences: e.target.value })} className="rounded-xl" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowEdit(false)}>{t("clients.cancel")}</Button>
              <Button className="flex-1 rounded-xl" onClick={handleEdit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("clients.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteClient")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clients.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("clients.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("clients.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
