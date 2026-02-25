import { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

const STATUSES = Constants.public.Enums.appointment_status;

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  services: any[];
  staff: any[];
  onUpdated: () => void;
}

export default function EditBookingDialog({ open, onOpenChange, appointment, services, staff, onUpdated }: EditBookingDialogProps) {
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [status, setStatus] = useState("Pending");
  const [internalNotes, setInternalNotes] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    setServiceId(appointment.service_id || "");
    setStaffId(appointment.staff_id || "");
    const start = new Date(appointment.start_time);
    setStartTime(`${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`);
    setStatus(appointment.status || "Pending");
    setInternalNotes(appointment.internal_notes || "");
    setIsPaid(appointment.is_paid || false);
    setConfirmDelete(false);
  }, [appointment, open]);

  const handleSave = async () => {
    if (!appointment) return;
    setSaving(true);
    const service = services.find((s: any) => s.id === serviceId);
    const date = new Date(appointment.start_time).toISOString().split("T")[0];
    const startDt = new Date(`${date}T${startTime}:00`);
    const endDt = new Date(startDt.getTime() + (service?.duration || 30) * 60000);

    const { error } = await supabase.from("appointments").update({
      service_id: serviceId || null,
      staff_id: staffId || null,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      status: status as any,
      internal_notes: internalNotes,
      is_paid: isPaid,
    }).eq("id", appointment.id);

    if (error) toast.error(error.message);
    else {
      toast.success("Appointment updated");
      onOpenChange(false);
      onUpdated();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!appointment) return;
    setDeleting(true);
    const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Appointment deleted");
      onOpenChange(false);
      onUpdated();
    }
    setDeleting(false);
  };

  if (!appointment) return null;

  const clientName = `${appointment.clients?.first_name || ""} ${appointment.clients?.last_name || ""}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Client info (read-only) */}
          <div className="rounded-xl bg-muted p-3">
            <p className="text-sm font-medium">{clientName || "Unknown Client"}</p>
            <p className="text-xs text-muted-foreground">Client</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Service</label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.service_name} ({s.duration} min)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Employee</label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {staff.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Internal Notes</label>
            <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="rounded-xl" rows={2} placeholder="Notes visible only to staff..." />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <label className="text-sm font-medium">Paid</label>
            <Switch checked={isPaid} onCheckedChange={setIsPaid} />
          </div>

          <div className="flex gap-3">
            {!confirmDelete ? (
              <Button variant="destructive" size="icon" className="rounded-xl" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delete"}
              </Button>
            )}
            <Button className="rounded-xl flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
