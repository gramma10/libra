import { useState, useEffect } from "react";
import { Loader2, Trash2, Bell, BellOff, Phone, Mail, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import { useLanguage } from "@/hooks/useLanguage";
import { bookingErrorMessage } from "@/lib/booking-errors";

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  services: any[];
  staff: any[];
  onUpdated: () => void;
}

interface ExtraServiceRow {
  id?: string; // existing row id
  service_id: string;
}

export default function EditBookingDialog({ open, onOpenChange, appointment, services, staff, onUpdated }: EditBookingDialogProps) {
  const { isAdmin, isManager, isStaff, staffRecordId } = useRole();
  const { t } = useLanguage();
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isNoShow, setIsNoShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [extraServices, setExtraServices] = useState<ExtraServiceRow[]>([]);
  const [originalExtras, setOriginalExtras] = useState<any[]>([]);

  useEffect(() => {
    if (!appointment || !open) return;
    setServiceId(appointment.service_id || "");
    setStaffId(appointment.staff_id || "");
    const start = new Date(appointment.start_time);
    setStartTime(`${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`);
    setInternalNotes(appointment.internal_notes || "");
    setIsNoShow(appointment.status === "No-Show");
    setConfirmDelete(false);

    // Load extra services
    (async () => {
      const { data } = await supabase
        .from("appointment_services")
        .select("*")
        .eq("appointment_id", appointment.id);
      const rows = data || [];
      setOriginalExtras(rows);
      setExtraServices(rows.map((r: any) => ({ id: r.id, service_id: r.service_id })));
    })();
  }, [appointment, open]);

  const mainService = services.find((s: any) => s.id === serviceId);
  const extraDetails = extraServices
    .map((e) => services.find((s: any) => s.id === e.service_id))
    .filter(Boolean) as any[];

  const totalDuration = (mainService?.duration || 0) + extraDetails.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalPrice = (mainService?.price || 0) + extraDetails.reduce((sum, s) => sum + Number(s.price || 0), 0);

  const handleAddExtra = () => {
    setExtraServices([...extraServices, { service_id: "" }]);
  };

  const handleRemoveExtra = (idx: number) => {
    setExtraServices(extraServices.filter((_, i) => i !== idx));
  };

  const handleChangeExtra = (idx: number, value: string) => {
    setExtraServices(extraServices.map((e, i) => (i === idx ? { ...e, service_id: value } : e)));
  };

  const handleSave = async () => {
    if (!appointment) return;
    setSaving(true);
    const date = new Date(appointment.start_time).toISOString().split("T")[0];
    const startDt = new Date(`${date}T${startTime}:00`);
    const endDt = new Date(startDt.getTime() + (totalDuration || 30) * 60000);

    const { error } = await supabase.from("appointments").update({
      service_id: serviceId || null,
      staff_id: staffId || null,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      status: (isNoShow ? "No-Show" : "Confirmed") as any,
      internal_notes: internalNotes,
      is_paid: !isNoShow,
    }).eq("id", appointment.id);

    if (error) {
      toast.error(bookingErrorMessage(error, error.message));
      setSaving(false);
      return;
    }

    // Sync extra services: delete removed, insert new
    const validExtras = extraServices.filter((e) => e.service_id);
    const originalIds = originalExtras.map((o) => o.id);
    const keptIds = validExtras.filter((e) => e.id).map((e) => e.id);
    const toDelete = originalIds.filter((id) => !keptIds.includes(id));
    const toInsert = validExtras.filter((e) => !e.id).map((e) => {
      const svc = services.find((s: any) => s.id === e.service_id);
      return {
        appointment_id: appointment.id,
        service_id: e.service_id,
        shop_id: appointment.shop_id,
        duration: svc?.duration || 0,
        price: svc?.price || 0,
      };
    });

    if (toDelete.length > 0) {
      await supabase.from("appointment_services").delete().in("id", toDelete);
    }
    if (toInsert.length > 0) {
      await supabase.from("appointment_services").insert(toInsert);
    }

    toast.success(t("editBooking.updated"));
    onOpenChange(false);
    onUpdated();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!appointment) return;
    setDeleting(true);
    const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("editBooking.deleted"));
      onOpenChange(false);
      onUpdated();
    }
    setDeleting(false);
  };

  if (!appointment) return null;

  const isOwnAppointment = isStaff && appointment.staff_id === staffRecordId;
  const canEdit = isAdmin || isManager || isOwnAppointment;
  const canDelete = isAdmin || isManager || isOwnAppointment;

  const client = appointment.clients;
  const clientName = `${client?.first_name || ""} ${client?.last_name || ""}`.trim();
  const clientPhone = client?.phone_mobile || "";
  const clientEmail = client?.email || "";
  const clientNotes = client?.personal_preferences || "";
  const clientTechNotes = client?.tech_notes || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editBooking.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl bg-muted p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{clientName || t("editBooking.unknownClient")}</p>
              </div>
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${appointment.reminder_sent ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                {appointment.reminder_sent ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                {appointment.reminder_sent ? t("editBooking.reminderSent") : t("editBooking.noReminder")}
              </div>
            </div>
            {clientPhone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <a href={`tel:${clientPhone}`} className="text-primary hover:underline">{clientPhone}</a>
              </div>
            )}
            {clientEmail && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <a href={`mailto:${clientEmail}`} className="text-primary hover:underline">{clientEmail}</a>
              </div>
            )}
            {(clientNotes || clientTechNotes) && (
              <div className="border-t border-border/50 pt-2 mt-2 space-y-1">
                {clientNotes && <p className="text-xs text-muted-foreground"><span className="font-medium">{t("editBooking.preferences")}:</span> {clientNotes}</p>}
                {clientTechNotes && <p className="text-xs text-muted-foreground"><span className="font-medium">{t("editBooking.techNotes")}:</span> {clientTechNotes}</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("editBooking.mainService")}</label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("booking.selectService")} /></SelectTrigger>
              <SelectContent>
                {services.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.service_name} ({s.duration} min · €{Number(s.price).toFixed(2)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t("editBooking.additionalServices")}</label>
              <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={handleAddExtra}>
                <Plus className="h-3 w-3 mr-1" /> {t("editBooking.addService")}
              </Button>
            </div>
            {extraServices.length > 0 && (
              <div className="space-y-2">
                {extraServices.map((extra, idx) => {
                  const svc = services.find((s: any) => s.id === extra.service_id);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <Select value={extra.service_id} onValueChange={(v) => handleChangeExtra(idx, v)}>
                        <SelectTrigger className="rounded-xl flex-1">
                          <SelectValue placeholder={t("booking.selectService")} />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.service_name} ({s.duration} min · €{Number(s.price).toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg shrink-0" onClick={() => handleRemoveExtra(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(mainService || extraDetails.length > 0) && (
            <div className="rounded-xl border bg-muted/40 p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("editBooking.totalDuration")}: <span className="font-semibold text-foreground">{totalDuration} min</span>
              </span>
              <span className="text-muted-foreground">
                {t("editBooking.totalPrice")}: <span className="font-semibold text-foreground">€{totalPrice.toFixed(2)}</span>
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("booking.employee")}</label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("booking.selectEmployee")} /></SelectTrigger>
              <SelectContent>
                {staff.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("booking.time")}</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("editBooking.internalNotes")}</label>
            <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="rounded-xl" rows={2} placeholder={t("editBooking.notesPlaceholder")} />
          </div>

          <Button
            variant={isNoShow ? "default" : "outline"}
            className={`w-full rounded-xl ${isNoShow ? "bg-muted-foreground text-background hover:bg-muted-foreground/80" : ""}`}
            onClick={() => setIsNoShow(!isNoShow)}
          >
            {isNoShow ? t("editBooking.markedNoShow") : t("editBooking.markNoShow")}
          </Button>

          {canEdit ? (
            <div className="flex gap-3">
              {canDelete && (
                !confirmDelete ? (
                  <Button variant="destructive" size="icon" className="rounded-xl" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("editBooking.confirmDelete")}
                  </Button>
                )
              )}
              <Button className="rounded-xl flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("editBooking.saveChanges")}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">{t("editBooking.viewOnly")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
