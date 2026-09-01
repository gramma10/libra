import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertTriangle, Loader2, ShoppingBag, Pencil, Package, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SellProductDialog from "@/components/inventory/SellProductDialog";
import StatCard from "@/components/reports/StatCard";
import { useRole } from "@/hooks/useRole";
import { useLanguage } from "@/hooks/useLanguage";
import { ALL_SCOPE, applyShopScope } from "@/lib/shopScope";
import { ShopBadge } from "@/components/franchise/ShopBadge";
import { ShopFilterSelect } from "@/components/franchise/ShopFilterSelect";

interface InventoryItem {
  id: string; product_name: string; sku: string | null; current_stock: number;
  min_stock_level: number; cost_price: number; retail_price: number;
  shop_id: string;
}
interface ProductSale { inventory_id: string; quantity: number; total_amount: number; sale_date: string; }

export default function InventoryPage() {
  const { isAdmin } = useRole();
  const { shopId, scope: shopScope, setScope: setShopScope, isFranchise, memberships } = useShop();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [monthSalesTotal, setMonthSalesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ product_name: string; sku: string; current_stock: number; min_stock_level: number; cost_price: number; retail_price: number; shop_id: string }>({ product_name: "", sku: "", current_stock: 0, min_stock_level: 0, cost_price: 0, retail_price: 0, shop_id: "" });
  const [sellProduct, setSellProduct] = useState<any>(null);

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], [now]);
  const monthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0], [now]);

  const fetchItems = async () => {
    setLoading(true);
    const [itemsRes, salesRes, expRes, monthSalesRes] = await Promise.all([
      applyShopScope(supabase.from("inventory").select("*").order("product_name"), shopScope),
      applyShopScope(supabase.from("product_sales").select("inventory_id, quantity, total_amount, sale_date"), shopScope),
      applyShopScope(
        supabase.from("expenses").select("amount, date, category").eq("category", "Products").gte("date", monthStart).lte("date", monthEnd),
        shopScope,
      ),
      applyShopScope(
        supabase.from("product_sales").select("total_amount").gte("sale_date", monthStart).lte("sale_date", monthEnd),
        shopScope,
      ),
    ]);
    setItems((itemsRes.data as InventoryItem[]) || []);
    setSales((salesRes.data as ProductSale[]) || []);
    setMonthExpenses((expRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0));
    setMonthSalesTotal((monthSalesRes.data || []).reduce((s: number, e: any) => s + Number(e.total_amount), 0));
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [shopScope]);

  const salesByProduct = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    const unitsMap: Record<string, number> = {};
    sales.forEach((s) => {
      revenueMap[s.inventory_id] = (revenueMap[s.inventory_id] || 0) + Number(s.total_amount);
      unitsMap[s.inventory_id] = (unitsMap[s.inventory_id] || 0) + Number(s.quantity);
    });
    return { revenue: revenueMap, units: unitsMap };
  }, [sales]);

  const filtered = items.filter((item) => item.product_name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = filtered.filter((i) => i.current_stock <= i.min_stock_level);

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setForm({ product_name: item.product_name, sku: item.sku || "", current_stock: item.current_stock, min_stock_level: item.min_stock_level, cost_price: Number(item.cost_price), retail_price: Number(item.retail_price), shop_id: item.shop_id });
    setShowAdd(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ product_name: "", sku: "", current_stock: 0, min_stock_level: 0, cost_price: 0, retail_price: 0, shop_id: shopScope === ALL_SCOPE ? "" : (shopId ?? "") });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.product_name) { toast.error(t("inventory.productRequired")); return; }
    const targetShopId = form.shop_id || shopId;
    if (!targetShopId) { toast.error(t("franchise.shopRequired")); return; }
    setSaving(true);
    const { shop_id: _formShopId, ...updateFields } = form;
    if (editItem) {
      const stockAdded = form.current_stock - editItem.current_stock;
      const { error } = await supabase.from("inventory").update(updateFields).eq("id", editItem.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      if (stockAdded > 0 && form.cost_price > 0) {
        await supabase.from("expenses").insert({ date: new Date().toISOString().split("T")[0], category: "Products" as any, amount: form.cost_price * stockAdded, status: "Paid" as any, description: `Restock of ${form.product_name} (${stockAdded} units)`, shop_id: targetShopId });
      }
      toast.success(t("inventory.productUpdated"));
    } else {
      const { error } = await supabase.from("inventory").insert({ ...updateFields, shop_id: targetShopId });
      if (error) { toast.error(error.message); setSaving(false); return; }
      if (form.current_stock > 0 && form.cost_price > 0) {
        await supabase.from("expenses").insert({ date: new Date().toISOString().split("T")[0], category: "Products" as any, amount: form.cost_price * form.current_stock, status: "Paid" as any, description: `Purchase of ${form.product_name} (${form.current_stock} units)`, shop_id: targetShopId });
      }
      toast.success(t("inventory.productAdded"));
    }
    setShowAdd(false); setEditItem(null);
    setForm({ product_name: "", sku: "", current_stock: 0, min_stock_level: 0, cost_price: 0, retail_price: 0, shop_id: "" });
    fetchItems(); setSaving(false);
  };

  const stats = isAdmin ? [
    { label: t("inventory.monthlyStockInvestment"), value: `€${monthExpenses.toFixed(0)}`, icon: Package, color: "hsl(var(--warning))" },
    { label: t("inventory.monthlyProductSales"), value: `€${monthSalesTotal.toFixed(0)}`, icon: TrendingUp, color: "hsl(var(--success))" },
  ] : [
    { label: t("inventory.monthlyProductSales"), value: `€${monthSalesTotal.toFixed(0)}`, icon: TrendingUp, color: "hsl(var(--success))" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("inventory.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} {t("inventory.products")} · {lowStock.length} {t("inventory.lowStock")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isFranchise && <ShopFilterSelect value={shopScope} onChange={setShopScope} className="w-48" />}
          {isAdmin && (
            <Button className="rounded-xl gap-2" onClick={openAdd}><Plus className="h-4 w-4" strokeWidth={1.5} />{t("inventory.addProduct")}</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (<StatCard key={stat.label} stat={stat} index={i} />))}
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-destructive">
              {isFranchise && shopScope === ALL_SCOPE ? t("franchise.lowStockBanner") : t("inventory.lowStockAlert")}
            </p>
            {isFranchise && shopScope === ALL_SCOPE ? (
              <div className="mt-1 space-y-0.5">
                {Object.entries(
                  lowStock.reduce<Record<string, string[]>>((acc, item) => {
                    const shop = memberships.find((m) => m.shopId === item.shop_id)?.shop.name ?? "—";
                    (acc[shop] ||= []).push(item.product_name);
                    return acc;
                  }, {}),
                ).map(([shop, names]) => (
                  <p key={shop} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{shop}:</span> {names.join(", ")}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">{lowStock.map((i) => i.product_name).join(", ")}</p>
            )}
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <Input placeholder={t("inventory.searchProducts")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-apple overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left p-4 font-medium">{t("inventory.product")}</th>
                {isFranchise && shopScope === ALL_SCOPE && <th className="text-left p-4 font-medium">{t("franchise.shop")}</th>}
                <th className="text-left p-4 font-medium">{t("inventory.sku")}</th>
                <th className="text-left p-4 font-medium">{t("inventory.stock")}</th>
                {isAdmin && <th className="text-left p-4 font-medium">{t("inventory.cost")}</th>}
                <th className="text-left p-4 font-medium">{t("inventory.retail")}</th>
                <th className="text-left p-4 font-medium">{t("inventory.unitsSold")}</th>
                <th className="text-left p-4 font-medium">{t("inventory.totalSales")}</th>
                <th className="text-right p-4 font-medium">{t("inventory.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">{t("inventory.noProducts")}</td></tr>
              )}
              {filtered.map((item) => {
                const isLow = item.current_stock <= item.min_stock_level;
                const totalRevenue = salesByProduct.revenue[item.id] || 0;
                const unitsSold = salesByProduct.units[item.id] || 0;
                return (
                  <tr key={item.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4"><p className="text-sm font-medium">{item.product_name}</p></td>
                    {isFranchise && shopScope === ALL_SCOPE && (
                      <td className="p-4"><ShopBadge shopId={item.shop_id} /></td>
                    )}
                    <td className="p-4 text-sm text-muted-foreground">{item.sku || "—"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", isLow ? "text-destructive" : "text-foreground")}>{item.current_stock}</span>
                        <span className="text-xs text-muted-foreground">/ {item.min_stock_level} {t("inventory.min")}</span>
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />}
                      </div>
                    </td>
                    {isAdmin && <td className="p-4 text-sm">€{Number(item.cost_price).toFixed(2)}</td>}
                    <td className="p-4 text-sm">€{Number(item.retail_price).toFixed(2)}</td>
                    <td className="p-4 text-sm font-medium text-muted-foreground">{unitsSold}</td>
                    <td className="p-4 text-sm font-semibold" style={{ color: totalRevenue > 0 ? "hsl(var(--success))" : undefined }}>€{totalRevenue.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <Button variant="ghost" size="sm" className="rounded-lg gap-1.5 text-xs" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />{t("inventory.edit")}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="rounded-lg gap-1.5 text-xs" onClick={() => setSellProduct(item)} disabled={item.current_stock <= 0}>
                          <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.5} />{t("inventory.sell")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditItem(null); } else setShowAdd(true); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{editItem ? t("inventory.editProduct") : t("inventory.addProduct")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editItem && isFranchise && shopScope === ALL_SCOPE && (
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("franchise.shop")} *</label>
                <ShopFilterSelect
                  value={form.shop_id}
                  onChange={(v) => setForm({ ...form, shop_id: v as string })}
                  requireSpecific
                  always
                  placeholder={t("franchise.selectShop")}
                  className="rounded-xl"
                />
              </div>
            )}
            <div className="space-y-1"><label className="text-sm font-medium">{t("inventory.productName")} *</label><Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="rounded-xl" /></div>
            <div className="space-y-1"><label className="text-sm font-medium">{t("inventory.sku")}</label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-sm font-medium">{t("inventory.currentStock")}</label><Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })} className="rounded-xl" /></div>
              <div className="space-y-1"><label className="text-sm font-medium">{t("inventory.minStockLevel")}</label><Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: Number(e.target.value) })} className="rounded-xl" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-sm font-medium">{t("inventory.costPrice")}</label><Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} className="rounded-xl" /></div>
              <div className="space-y-1"><label className="text-sm font-medium">{t("inventory.retailPrice")}</label><Input type="number" step="0.01" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: Number(e.target.value) })} className="rounded-xl" /></div>
            </div>
            <Button className="w-full rounded-xl" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editItem ? t("inventory.saveChanges") : t("inventory.addProduct")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SellProductDialog open={!!sellProduct} onOpenChange={(open) => { if (!open) setSellProduct(null); }} product={sellProduct} onSuccess={fetchItems} />
    </motion.div>
  );
}
