import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useLanguage } from "@/hooks/useLanguage";

type Service = Tables<"services">;

const defaultForm: Partial<TablesInsert<"services">> = {
  service_name: "", duration: 30, price: 0, category_color: "#000000",
};

export default function ServicesPage() {
  const qc = useQueryClient();
  const { shopId } = useShop();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("service_name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      if (values.id) {
        const { error } = await supabase.from("services").update({
          service_name: values.service_name!, duration: values.duration!, price: values.price!, category_color: values.category_color!,
        }).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert({
          service_name: values.service_name!, duration: values.duration!, price: values.price!, category_color: values.category_color!, shop_id: shopId!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success(editing ? t("services.updated") : t("services.added"));
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success(t("services.deleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAdd() { setEditing(null); setForm(defaultForm); setOpen(true); }
  function openEdit(s: Service) {
    setEditing(s);
    setForm({ service_name: s.service_name, duration: s.duration, price: Number(s.price), category_color: s.category_color });
    setOpen(true);
  }
  function closeDialog() { setOpen(false); setEditing(null); setForm(defaultForm); }
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); upsert.mutate({ ...form, id: editing?.id }); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("services.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("services.subtitle")}</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> {t("services.addService")}</Button>
      </div>

      <div className="glass rounded-2xl shadow-apple overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("services.color")}</TableHead>
              <TableHead>{t("services.name")}</TableHead>
              <TableHead>{t("services.duration")}</TableHead>
              <TableHead>{t("services.priceLabel")}</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("services.loading")}</TableCell></TableRow>
            ) : services.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("services.noServices")}</TableCell></TableRow>
            ) : (
              services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><div className="h-5 w-5 rounded-full border border-border" style={{ background: s.category_color }} /></TableCell>
                  <TableCell className="font-medium">{s.service_name}</TableCell>
                  <TableCell>{s.duration} min</TableCell>
                  <TableCell>€{Number(s.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("services.editService") : t("services.addService")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>{t("services.serviceName")}</Label><Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("services.durationMin")}</Label><Input type="number" min={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} required /></div>
              <div className="space-y-2"><Label>{t("services.priceEur")}</Label><Input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required /></div>
            </div>
            <div className="space-y-2">
              <Label>{t("services.categoryColor")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.category_color} onChange={(e) => setForm({ ...form, category_color: e.target.value })} className="h-9 w-9 cursor-pointer rounded-lg border border-input p-0.5" />
                <span className="text-sm text-muted-foreground">{form.category_color}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>{t("services.cancel")}</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? t("services.saving") : t("services.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
