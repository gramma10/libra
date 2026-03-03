import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { toast } from "sonner";
import type { Expense } from "@/pages/ExpensesPage";

const CATEGORIES = ["Rent", "Electricity", "Water", "Products", "Salaries", "Marketing", "Other"] as const;
const STATUSES = ["Paid", "Pending"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSaved: () => void;
}

export default function ExpenseDialog({ open, onOpenChange, expense, onSaved }: Props) {
  const { shopId } = useShop();
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string>("Pending");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setDate(expense.date);
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setStatus(expense.status);
      setDescription(expense.description || "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setCategory("Other");
      setAmount("");
      setStatus("Pending");
      setDescription("");
    }
  }, [expense, open]);

  const handleSave = async () => {
    if (!date || !amount) { toast.error("Date and amount are required"); return; }
    setSaving(true);

    const payload: any = {
      date,
      category: category as Expense["category"],
      amount: Number(amount),
      status: status as Expense["status"],
      description,
    };

    if (expense) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", expense.id);
      if (error) { toast.error("Save failed"); setSaving(false); return; }
    } else {
      payload.shop_id = shopId;
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) { toast.error("Save failed"); setSaving(false); return; }
    }

    setSaving(false);
    toast.success(expense ? "Expense updated" : "Expense added");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "New Expense"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (€)</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." className="rounded-xl resize-none" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? "Saving…" : expense ? "Update" : "Add Expense"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
