import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { ALL_SCOPE, applyShopScope } from "@/lib/shopScope";
import { ShopBadge } from "@/components/franchise/ShopBadge";
import { ShopFilterSelect } from "@/components/franchise/ShopFilterSelect";

interface Staff {
  id: string; first_name: string; last_name: string; phone: string; email: string | null;
  role: string; commission_rate: number; is_active: boolean; user_id: string | null; created_at: string;
  shop_id: string;
}

const defaultForm = {
  first_name: "", last_name: "", phone: "", email: "", password: "",
  role: "Stylist", commission_rate: 0, is_active: true, shop_id: "",
};

export default function StaffPage() {
  const qc = useQueryClient();
  const { shopId, scope, setScope, isFranchise } = useShop();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff", scope],
    queryFn: async () => {
      const query = supabase.from("staff").select("*").order("first_name");
      const { data, error } = await applyShopScope(query, scope);
      if (error) throw error;
      return data as Staff[];
    },
  });

  const updateStaff = useMutation({
    mutationFn: async (values: typeof form & { id: string }) => {
      const { error } = await supabase.from("staff").update({
        first_name: values.first_name, last_name: values.last_name, phone: values.phone,
        email: values.email || null, role: values.role, commission_rate: values.commission_rate, is_active: values.is_active,
      }).eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); toast.success(t("staff.updated")); closeDialog(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createStaff = useMutation({
    mutationFn: async (values: typeof form) => {
      const targetShopId = values.shop_id || shopId;
      if (!targetShopId) throw new Error(t("franchise.shopRequired"));
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: values.email, password: values.password, first_name: values.first_name,
          last_name: values.last_name, phone: values.phone, role: values.role, commission_rate: values.commission_rate,
          shop_id: targetShopId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create employee account");
      return result;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); toast.success(t("staff.created")); closeDialog(); },
    onError: (e: Error) => {
      if (e.message.includes("already in use")) setEmailError(t("staff.emailInUse"));
      else toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); toast.success(t("staff.deleted")); },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAdd() { setEditing(null); setForm(defaultForm); setEmailError(""); setShowPassword(false); setOpen(true); }
  function openEdit(s: Staff) {
    setEditing(s);
    setForm({ first_name: s.first_name, last_name: s.last_name, phone: s.phone, email: s.email ?? "", password: "", role: s.role, commission_rate: Number(s.commission_rate), is_active: s.is_active, shop_id: s.shop_id });
    setEmailError(""); setOpen(true);
  }
  function closeDialog() { setOpen(false); setEditing(null); setForm(defaultForm); setEmailError(""); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setEmailError("");
    if (editing) { updateStaff.mutate({ ...form, id: editing.id }); }
    else {
      if (!form.email) { setEmailError(t("staff.emailRequired")); return; }
      if (!form.password || form.password.length < 6) { toast.error(t("staff.passwordMinError")); return; }
      if (isFranchise && scope === ALL_SCOPE && !form.shop_id) { toast.error(t("franchise.shopRequired")); return; }
      createStaff.mutate(form);
    }
  }

  const isPending = createStaff.isPending || updateStaff.isPending;
  const showShopColumn = isFranchise && scope === ALL_SCOPE;
  const colSpan = showShopColumn ? 7 : 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("staff.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("staff.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isFranchise && <ShopFilterSelect value={scope} onChange={setScope} className="w-48" />}
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> {t("staff.addEmployee")}</Button>
        </div>
      </div>

      <div className="glass rounded-2xl shadow-apple overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("staff.nameCol")}</TableHead>
              {showShopColumn && <TableHead>{t("franchise.shop")}</TableHead>}
              <TableHead>{t("staff.role")}</TableHead>
              <TableHead>{t("staff.phoneCol")}</TableHead>
              <TableHead>{t("staff.commission")}</TableHead>
              <TableHead>{t("staff.statusCol")}</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={colSpan} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
            ) : staff.length === 0 ? (
              <TableRow><TableCell colSpan={colSpan} className="text-center text-muted-foreground">{t("staff.noEmployees")}</TableCell></TableRow>
            ) : (
              staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {s.first_name} {s.last_name}
                      {s.user_id && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t("staff.linked")}</Badge>}
                    </div>
                  </TableCell>
                  {showShopColumn && <TableCell><ShopBadge shopId={s.shop_id} /></TableCell>}
                  <TableCell>{s.role}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{Number(s.commission_rate)}%</TableCell>
                  <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? t("staff.active") : t("staff.inactive")}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{editing ? t("staff.editEmployee") : t("staff.addEmployee")}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editing && isFranchise && scope === ALL_SCOPE && (
              <div className="space-y-2">
                <Label>{t("franchise.shop")}</Label>
                <ShopFilterSelect
                  value={form.shop_id}
                  onChange={(v) => setForm({ ...form, shop_id: v as string })}
                  requireSpecific
                  always
                  placeholder={t("franchise.selectShop")}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("staff.firstNameLabel")}</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>{t("staff.lastNameLabel")}</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("staff.emailLabel")} {!editing && <span className="text-destructive">*</span>}</Label>
                <Input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setEmailError(""); }} required={!editing} disabled={!!editing?.user_id} />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
              </div>
              <div className="space-y-2"><Label>{t("staff.phoneCol")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>{t("staff.tempPassword")} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("staff.minChars")} required minLength={6} className="pr-9" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t("staff.passwordChangeNote")}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("staff.role")}</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder={t("staff.rolePlaceholder")} /></div>
              <div className="space-y-2"><Label>{t("staff.commissionPercent")}</Label><Input type="number" min={0} max={100} value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? t("services.saving") : t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
