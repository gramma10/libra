import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Service = Tables<"services">;

const defaultForm: Partial<TablesInsert<"services">> = {
  service_name: "",
  duration: 30,
  price: 0,
  category_color: "#000000",
};

export default function ServicesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("service_name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from("services")
          .update({
            service_name: values.service_name!,
            duration: values.duration!,
            price: values.price!,
            category_color: values.category_color!,
          })
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert({
          service_name: values.service_name!,
          duration: values.duration!,
          price: values.price!,
          category_color: values.category_color!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success(editing ? "Service updated" : "Service added");
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
      toast.success("Service deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAdd() {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({
      service_name: s.service_name,
      duration: s.duration,
      price: Number(s.price),
      category_color: s.category_color,
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground">Manage the services your salon offers</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </div>

      <div className="glass rounded-2xl shadow-apple overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No services yet</TableCell>
              </TableRow>
            ) : (
              services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ background: s.category_color }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{s.service_name}</TableCell>
                  <TableCell>{s.duration} min</TableCell>
                  <TableCell>€{Number(s.price).toFixed(2)}</TableCell>
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
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min={5}
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Price (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.category_color}
                  onChange={(e) => setForm({ ...form, category_color: e.target.value })}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-input p-0.5"
                />
                <span className="text-sm text-muted-foreground">{form.category_color}</span>
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
