import { useState, useEffect } from "react";
import { Loader2, UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  prefillStaffId: string;
  prefillTime: string;
  services: any[];
  staff: any[];
  onCreated: () => void;
}

export default function NewBookingDialog({ open, onOpenChange, currentDate, prefillStaffId, prefillTime, services, staff, onCreated }: NewBookingDialogProps) {
  const [phone, setPhone] = useState("");
  const [clientMatch, setClientMatch] = useState<any | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [searching, setSearching] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState(prefillStaffId);
  const [startTime, setStartTime] = useState(prefillTime);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStaffId(prefillStaffId);
    setStartTime(prefillTime);
    setPhone("");
    setClientMatch(null);
    setIsNewClient(false);
    setNewFirstName("");
    setNewLastName("");
    setServiceId("");
  }, [open, prefillStaffId, prefillTime]);

  // Search client by phone with debounce
  useEffect(() => {
    if (phone.length < 3) { setClientMatch(null); setIsNewClient(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from("clients").select("id, first_name, last_name, phone_mobile").eq("phone_mobile", phone).maybeSingle();
      if (data) {
        setClientMatch(data);
        setIsNewClient(false);
      } else {
        setClientMatch(null);
        setIsNewClient(true);
      }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [phone]);

  const handleSubmit = async () => {
    if (!phone || phone.length < 3) { toast.error("Enter a phone number"); return; }
    if (!serviceId || !startTime) { toast.error("Fill all required fields"); return; }
    if (isNewClient && (!newFirstName || !newLastName)) { toast.error("Enter the client's name"); return; }

    setSaving(true);

    const service = services.find((s: any) => s.id === serviceId);
    const startDt = new Date(`${currentDate.toISOString().split("T")[0]}T${startTime}:00`);
    const endDt = new Date(startDt.getTime() + (service?.duration || 30) * 60000);

    // Check for overlapping appointments for the same staff member
    if (staffId) {
      const { data: overlapping } = await supabase
        .from("appointments")
        .select("id")
        .eq("staff_id", staffId)
        .lt("start_time", endDt.toISOString())
        .gt("end_time", startDt.toISOString())
        .limit(1);

      if (overlapping && overlapping.length > 0) {
        toast.error("This time slot overlaps with an existing appointment for this employee.");
        setSaving(false);
        return;
      }
    }

    let clientId = clientMatch?.id;

    // Create new client if needed
    if (isNewClient) {
      const { data, error } = await supabase.from("clients").insert({ first_name: newFirstName, last_name: newLastName, phone_mobile: phone }).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      clientId = data.id;
    }

    const { error } = await supabase.from("appointments").insert({
      client_id: clientId,
      service_id: serviceId,
      staff_id: staffId || null,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
    });

    if (error) toast.error(error.message);
    else {
      toast.success(isNewClient ? "Booking created & new client added!" : "Booking created!");
      onOpenChange(false);
      onCreated();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Phone lookup */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Phone Number</label>
            <Input
              placeholder="Enter phone number..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl"
            />
            {searching && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Searching...</p>}
            {clientMatch && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-3 py-2 text-sm">
                <UserCheck className="h-4 w-4" />
                <span className="font-medium">{clientMatch.first_name} {clientMatch.last_name}</span>
                <span className="text-xs text-muted-foreground">— existing client</span>
              </div>
            )}
            {isNewClient && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-xl bg-accent text-accent-foreground px-3 py-2 text-sm">
                  <UserPlus className="h-4 w-4" />
                  <span className="font-medium">New client — enter their details</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="First name" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="rounded-xl" />
                  <Input placeholder="Last name" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="rounded-xl" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Service</label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.service_name} ({s.duration} min — €{s.price})</SelectItem>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Time</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl" />
          </div>

          <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
