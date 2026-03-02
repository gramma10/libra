import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface DayHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

interface Props {
  hours: DayHours[];
  onChange: (hours: DayHours[]) => void;
}

export default function OperatingHoursEditor({ hours, onChange }: Props) {
  const update = (idx: number, patch: Partial<DayHours>) => {
    const next = hours.map((h, i) => (i === idx ? { ...h, ...patch } : h));
    // Validate close > open
    const item = next[idx];
    if (patch.close && !item.isClosed && item.open >= patch.close) {
      toast.error("Closing time must be after opening time");
      return;
    }
    if (patch.open && !item.isClosed && patch.open >= item.close) {
      toast.error("Opening time must be before closing time");
      return;
    }
    onChange(next);
  };

  const copyToAll = (idx: number) => {
    const src = hours[idx];
    onChange(hours.map((h) => ({ ...h, open: src.open, close: src.close, isClosed: src.isClosed })));
    toast.success("Copied to all days");
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Operating Hours</label>
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        {hours.map((h, i) => (
          <div key={h.day} className="flex items-center gap-3 py-2">
            <span className="text-sm font-medium w-24 shrink-0">{h.day}</span>
            <Switch checked={!h.isClosed} onCheckedChange={(v) => update(i, { isClosed: !v })} />
            <span className="text-xs text-muted-foreground w-10">{h.isClosed ? "Closed" : "Open"}</span>
            {!h.isClosed && (
              <>
                <Select value={h.open} onValueChange={(v) => update(i, { open: v })}>
                  <SelectTrigger className="w-[100px] rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">to</span>
                <Select value={h.close} onValueChange={(v) => update(i, { close: v })}>
                  <SelectTrigger className="w-[100px] rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToAll(i)} title="Copy to all days">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
