import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  created_at: string;
}

const defaultForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  role: "Stylist",
  commission_rate: 0,
  is_active: true,
};

export default function StaffPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState(defaultForm);

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

  const upsert = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        email: values.email || null,
        role: values.role,
        commission_rate: values.commission_rate,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("staff").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("staff").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success(editing ? "Employee updated" : "Employee added");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
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
    setOpen(true);
  }

  function openEdit(s: Staff) {
    setEditing(s);
    setForm({
      first_name: s.first_name,
      last_name: s.last_name,
      phone: s.phone,
      email: s.email ?? "",
      role: s.role,
      commission_rate: Number(s.commission_rate),
      is_active: s.is_active,
    });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm(defaultForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate({ ...form, id: editing?.id });
  }

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
                  <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove.mutate(s.id)}
                      >
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. Stylist, Colorist, Manager"
                />
              </div>
              <div className="space-y-2">
                <Label>Commission (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.commission_rate}
                  onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
