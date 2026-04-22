import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Receipt, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ExpenseDialog from "@/components/expenses/ExpenseDialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useShop } from "@/hooks/useShop";

const CATEGORIES = ["Rent", "Electricity", "Water", "Products", "Salaries", "Marketing", "Other"] as const;
const STATUSES = ["Paid", "Pending"] as const;
const RECURRENCE_MONTHS: Record<string, number> = { monthly: 1, bimonthly: 2, quarterly: 3, yearly: 12 };

export type Expense = {
  id: string; date: string; category: (typeof CATEGORIES)[number]; amount: number;
  status: (typeof STATUSES)[number]; description: string | null; created_at: string;
  recurrence_interval?: string; recurrence_parent_id?: string | null;
};

export default function ExpensesPage() {
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  const MONTHS = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i).toLocaleString(locale, { month: "long" })
  );

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const month = Number(filterMonth);
    const year = Number(filterYear);
    const start = new Date(year, month, 1).toISOString().split("T")[0];
    const end = new Date(year, month + 1, 0).toISOString().split("T")[0];
    const { data, error } = await supabase.from("expenses").select("*").gte("date", start).lte("date", end).order("date", { ascending: false });
    if (error) toast.error("Failed to load expenses");
    setExpenses((data as Expense[]) || []);
    setLoading(false);
  }, [filterMonth, filterYear]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error(t("expenses.deleteFailed")); return; }
    toast.success(t("expenses.expenseDeleted"));
    fetchExpenses();
  };

  const handleEdit = (exp: Expense) => { setEditing(exp); setDialogOpen(true); };
  const handleNew = () => { setEditing(null); setDialogOpen(true); };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const categoryColor: Record<string, string> = {
    Rent: "bg-blue-100 text-blue-700", Electricity: "bg-yellow-100 text-yellow-700",
    Water: "bg-cyan-100 text-cyan-700", Products: "bg-purple-100 text-purple-700",
    Salaries: "bg-green-100 text-green-700", Marketing: "bg-pink-100 text-pink-700",
    Other: "bg-muted text-muted-foreground",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("expenses.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("expenses.subtitle")}</p>
        </div>
        <Button onClick={handleNew} className="rounded-xl gap-2"><Plus className="h-4 w-4" /> {t("expenses.newExpense")}</Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[130px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[90px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="sm:ml-auto rounded-2xl border border-border bg-card px-4 py-2 shadow-apple">
          <span className="text-xs text-muted-foreground font-medium">{t("expenses.total")}: </span>
          <span className="text-sm font-semibold">€{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-apple overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Receipt className="h-10 w-10 mb-2" />
            <p className="text-sm">{t("expenses.noExpenses")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("expenses.dateCol")}</TableHead>
                <TableHead>{t("expenses.category")}</TableHead>
                <TableHead>{t("expenses.description")}</TableHead>
                <TableHead className="text-right">{t("expenses.amount")}</TableHead>
                <TableHead>{t("expenses.statusCol")}</TableHead>
                <TableHead className="w-[100px]">{t("expenses.actionsCol")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-sm">{new Date(exp.date + "T00:00:00").toLocaleDateString(locale)}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor[exp.category] || ""}`}>{exp.category}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{exp.description || "—"}</TableCell>
                  <TableCell className="text-right text-sm font-medium">€{Number(exp.amount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={exp.status === "Paid" ? "default" : "secondary"} className="text-[10px]">{exp.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleEdit(exp)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive" onClick={() => handleDelete(exp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} expense={editing} onSaved={fetchExpenses} />
    </motion.div>
  );
}
