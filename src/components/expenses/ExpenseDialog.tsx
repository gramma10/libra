import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { Repeat } from "lucide-react";
import type { Expense } from "@/pages/ExpensesPage";
import { ALL_SCOPE } from "@/lib/shopScope";
import { ShopFilterSelect } from "@/components/franchise/ShopFilterSelect";

const CATEGORIES = ["Rent", "Electricity", "Water", "Products", "Salaries", "Marketing", "Other"] as const;
const STATUSES = ["Paid", "Pending"] as const;
const RECURRENCES = [
  { value: "none", labelKey: "expenses.recurNone" },
  { value: "monthly", labelKey: "expenses.recurMonthly" },
  { value: "bimonthly", labelKey: "expenses.recurBimonthly" },
  { value: "quarterly", labelKey: "expenses.recurQuarterly" },
  { value: "yearly", labelKey: "expenses.recurYearly" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSaved: () => void;
}

export default function ExpenseDialog({ open, onOpenChange, expense, onSaved }: Props) {
  const { shopId, scope: shopScope, isFranchise } = useShop();
  const { t } = useLanguage();
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string>("Pending");
  const [description, setDescription] = useState("");
  const [recurrence, setRecurrence] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<"this" | "future">("this");
  const [targetShopId, setTargetShopId] = useState<string>("");

  const isOccurrence = !!expense?.recurrence_parent_id;
  const isRecurringTemplate = !!expense && !expense.recurrence_parent_id && (expense.recurrence_interval || "none") !== "none";
  const isRecurring = isOccurrence || isRecurringTemplate;
  const amountChanged = !!expense && Number(amount || 0) !== Number(expense.amount);
  const showScope = isRecurring && amountChanged;

  useEffect(() => {
    if (expense) {
      setDate(expense.date);
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setStatus(expense.status);
      setDescription(expense.description || "");
      setRecurrence(expense.recurrence_interval || "none");
      setTargetShopId(expense.shop_id || "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setCategory("Other");
      setAmount("");
      setStatus("Pending");
      setDescription("");
      setRecurrence("none");
      setTargetShopId(shopScope === ALL_SCOPE ? "" : (shopId ?? ""));
    }
    setScope("this");
  }, [expense, open, shopScope, shopId]);

  const handleSave = async () => {
    if (!date || !amount) { toast.error(t("expenses.dateAmountRequired")); return; }
    setSaving(true);

    const newAmount = Number(amount);
    const payload: any = {
      date,
      category: category as Expense["category"],
      amount: newAmount,
      status: status as Expense["status"],
      description,
    };

    if (expense) {
      if (!isOccurrence) payload.recurrence_interval = recurrence;
      const { error } = await supabase.from("expenses").update(payload).eq("id", expense.id);
      if (error) { toast.error(t("expenses.saveFailed")); setSaving(false); return; }

      // Propagate amount change to template + future siblings if scope = future
      if (showScope && scope === "future") {
        const parentId = isOccurrence ? expense.recurrence_parent_id! : expense.id;
        await supabase.from("expenses").update({ amount: newAmount }).eq("id", parentId);
        await supabase
          .from("expenses")
          .update({ amount: newAmount })
          .eq("recurrence_parent_id", parentId)
          .gt("date", expense.date);
      }
    } else {
      const insertShopId = targetShopId || shopId;
      if (!insertShopId) { toast.error(t("franchise.shopRequired")); setSaving(false); return; }
      payload.shop_id = insertShopId;
      payload.recurrence_interval = recurrence;
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) { toast.error(t("expenses.saveFailed")); setSaving(false); return; }
    }

    setSaving(false);
    toast.success(expense ? t("expenses.expenseUpdated") : t("expenses.expenseAdded"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? t("expenses.editExpense") : t("expenses.newExpense")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {!expense && isFranchise && shopScope === ALL_SCOPE && (
            <div className="space-y-1.5">
              <Label>{t("franchise.shop")}</Label>
              <ShopFilterSelect
                value={targetShopId}
                onChange={(v) => setTargetShopId(v as string)}
                requireSpecific
                always
                placeholder={t("franchise.selectShop")}
                className="rounded-xl"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("expenses.dateCol")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("expenses.amountEur")}</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("expenses.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("expenses.statusCol")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5" />
              {t("expenses.recurrence")}
            </Label>
            <Select value={recurrence} onValueChange={setRecurrence} disabled={isOccurrence}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECURRENCES.map((r) => <SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>)}
              </SelectContent>
            </Select>
            {isOccurrence ? (
              <p className="text-[11px] text-muted-foreground">{t("expenses.occurrenceHint")}</p>
            ) : recurrence !== "none" ? (
              <p className="text-[11px] text-muted-foreground">{t("expenses.recurrenceHint")}</p>
            ) : null}
          </div>

          {showScope && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <Label className="text-xs font-medium">{t("expenses.applyScope")}</Label>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="expense-scope"
                    value="this"
                    checked={scope === "this"}
                    onChange={() => setScope("this")}
                    className="accent-primary"
                  />
                  {t("expenses.scopeThis")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="expense-scope"
                    value="future"
                    checked={scope === "future"}
                    onChange={() => setScope("future")}
                    className="accent-primary"
                  />
                  {t("expenses.scopeFuture")}
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">{t("expenses.scopeHint")}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t("expenses.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="..." className="rounded-xl resize-none" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">{t("expenses.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? "Saving…" : expense ? t("expenses.update") : t("expenses.addExpense")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
