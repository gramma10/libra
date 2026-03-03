import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  role: string;
  commission_rate: number;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
}

const defaultForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  password: "",
  role: "Stylist",
  commission_rate: 0,
  is_active: true,
};

export default function StaffPage() {
  const qc = useQueryClient();
  const { shopId } = useShop();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("first_name");
      if (error) throw error;
      return data as Staff[];
    },
  });

  // Update existing staff (no auth changes)
  const updateStaff = useMutation({
    mutationFn: async (values: typeof form & { id: string }) => {
      const { error } = await supabase.from("staff").update({
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        email: values.email || null,
        role: values.role,
        commission_rate: values.commission_rate,
        is_active: values.is_active,
      }).eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Employee updated");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Create new staff via edge function
  const createStaff = useMutation({
    mutationFn: async (values: typeof form) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone,
            role: values.role,
            commission_rate: values.commission_rate,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create employee account");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Employee account created. Please share the credentials with them.");
      closeDialog();
    },
    onError: (e: Error) => {
      if (e.message.includes("already in use")) {
        setEmailError("This email is already in use.");
      } else {
        toast.error(e.message);
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Employee deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAdd() {
    setEditing(null);
    setForm(defaultForm);
    setEmailError("");
    setShowPassword(false);
    setOpen(true);
  }

  function openEdit(s: Staff) {
    setEditing(s);
    setForm({
      first_name: s.first_name,
      last_name: s.last_name,
      phone: s.phone,
      email: s.email ?? "",
      password: "",
      role: s.role,
      commission_rate: Number(s.commission_rate),
      is_active: s.is_active,
    });
    setEmailError("");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm(defaultForm);
    setEmailError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");

    if (editing) {
      updateStaff.mutate({ ...form, id: editing.id });
    } else {
      if (!form.email) {
        setEmailError("Email is required for new employees.");
        return;
      }
      if (!form.password || form.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      createStaff.mutate(form);
    }
  }

  const isPending = createStaff.isPending || updateStaff.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage your salon staff</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="glass rounded-2xl shadow-apple overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No employees yet</TableCell>
              </TableRow>
            ) : (
              staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {s.first_name} {s.last_name}
                      {s.user_id && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">linked</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{s.role}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{Number(s.commission_rate)}%</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "default" : "secondary"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email {!editing && <span className="text-destructive">*</span>}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setEmailError("");
                  }}
                  required={!editing}
                  disabled={!!editing?.user_id}
                />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            {/* Password field only for new employees */}
            {!editing && (
              <div className="space-y-2">
                <Label>Temporary Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The employee will be asked to change this on first login.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Stylist, Colorist" />
              </div>
              <div className="space-y-2">
                <Label>Commission (%)</Label>
                <Input type="number" min={0} max={100} value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
