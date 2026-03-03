import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertTriangle, Loader2, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SellProductDialog from "@/components/inventory/SellProductDialog";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_name: "", sku: "", current_stock: 0, min_stock_level: 0, cost_price: 0, retail_price: 0 });
  const [sellProduct, setSellProduct] = useState<any>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("inventory").select("*").order("product_name");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter((item) =>
    item.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = filtered.filter((i) => i.current_stock <= i.min_stock_level);

  const handleAdd = async () => {
    if (!form.product_name) { toast.error("Product name is required"); return; }
    setSaving(true);

    const { error } = await supabase.from("inventory").insert(form);
    if (error) { toast.error(error.message); setSaving(false); return; }

    // Auto-create expense if initial stock > 0
    if (form.current_stock > 0 && form.cost_price > 0) {
      const expenseAmount = form.cost_price * form.current_stock;
      await supabase.from("expenses").insert({
        date: new Date().toISOString().split("T")[0],
        category: "Products" as any,
        amount: expenseAmount,
        status: "Paid" as any,
        description: `Purchase of ${form.product_name} (${form.current_stock} units)`,
      });
    }

    toast.success("Product added");
    setShowAdd(false);
    setForm({ product_name: "", sku: "", current_stock: 0, min_stock_level: 0, cost_price: 0, retail_price: 0 });
    fetchItems();
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} products · {lowStock.length} low stock</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Product
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-destructive">Low Stock Alert</p>
            <p className="text-xs text-muted-foreground mt-0.5">{lowStock.map((i) => i.product_name).join(", ")}</p>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left p-4 font-medium">Product</th>
                <th className="text-left p-4 font-medium">SKU</th>
                <th className="text-left p-4 font-medium">Stock</th>
                <th className="text-left p-4 font-medium">Cost</th>
                <th className="text-left p-4 font-medium">Retail</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No products found.</td></tr>
              )}
              {filtered.map((item) => {
                const isLow = item.current_stock <= item.min_stock_level;
                return (
                  <tr key={item.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4"><p className="text-sm font-medium">{item.product_name}</p></td>
                    <td className="p-4 text-sm text-muted-foreground">{item.sku || "—"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", isLow ? "text-destructive" : "text-foreground")}>{item.current_stock}</span>
                        <span className="text-xs text-muted-foreground">/ {item.min_stock_level} min</span>
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />}
                      </div>
                    </td>
                    <td className="p-4 text-sm">€{Number(item.cost_price).toFixed(2)}</td>
                    <td className="p-4 text-sm">€{Number(item.retail_price).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg gap-1.5 text-xs"
                        onClick={() => setSellProduct(item)}
                        disabled={item.current_stock <= 0}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Sell
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Product Name *</label>
              <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">SKU</label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Current Stock</label>
                <Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Min Stock Level</label>
                <Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: Number(e.target.value) })} className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Cost Price (€)</label>
                <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Retail Price (€)</label>
                <Input type="number" step="0.01" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: Number(e.target.value) })} className="rounded-xl" />
              </div>
            </div>
            {form.current_stock > 0 && form.cost_price > 0 && (
              <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                Auto-expense: €{(form.cost_price * form.current_stock).toFixed(2)} will be logged under "Products"
              </div>
            )}
            <Button className="w-full rounded-xl" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SellProductDialog
        open={!!sellProduct}
        onOpenChange={(open) => { if (!open) setSellProduct(null); }}
        product={sellProduct}
        onSuccess={fetchItems}
      />
    </motion.div>
  );
}
