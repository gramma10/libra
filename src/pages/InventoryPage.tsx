import { motion } from "framer-motion";
import { Search, Plus, AlertTriangle, Package } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  autoDeduct: boolean;
}

const MOCK_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Color Cream 7.1 Ash Blonde", brand: "L'Oréal Professionnel", category: "Color", stock: 4, minStock: 5, unit: "tubes", autoDeduct: true },
  { id: "2", name: "Developer 20 Vol", brand: "L'Oréal Professionnel", category: "Color", stock: 12, minStock: 5, unit: "bottles", autoDeduct: true },
  { id: "3", name: "Olaplex No. 1", brand: "Olaplex", category: "Treatment", stock: 2, minStock: 3, unit: "bottles", autoDeduct: true },
  { id: "4", name: "Keratin Smoothing System", brand: "GKhair", category: "Treatment", stock: 6, minStock: 2, unit: "kits", autoDeduct: true },
  { id: "5", name: "Styling Mousse", brand: "Moroccanoil", category: "Styling", stock: 15, minStock: 5, unit: "cans", autoDeduct: false },
  { id: "6", name: "Shampoo 1L", brand: "Kérastase", category: "Care", stock: 8, minStock: 4, unit: "bottles", autoDeduct: false },
  { id: "7", name: "Color Cream 5.0 Natural Brown", brand: "L'Oréal Professionnel", category: "Color", stock: 1, minStock: 5, unit: "tubes", autoDeduct: true },
  { id: "8", name: "Bleach Powder", brand: "Schwarzkopf", category: "Color", stock: 3, minStock: 4, unit: "bags", autoDeduct: true },
];

export default function InventoryPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_INVENTORY.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.brand.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = filtered.filter((i) => i.stock <= i.minStock);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{MOCK_INVENTORY.length} products · {lowStock.length} low stock</p>
        </div>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Product
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-destructive">Low Stock Alert</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lowStock.map((i) => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-apple overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
              <th className="text-left p-4 font-medium">Product</th>
              <th className="text-left p-4 font-medium">Category</th>
              <th className="text-left p-4 font-medium">Stock</th>
              <th className="text-left p-4 font-medium">Auto-deduct</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => {
              const isLow = item.stock <= item.minStock;
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold", isLow ? "text-destructive" : "text-foreground")}>
                        {item.stock}
                      </span>
                      <span className="text-xs text-muted-foreground">/ {item.minStock} min {item.unit}</span>
                      {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                      item.autoDeduct ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}>
                      <Package className="h-3 w-3" strokeWidth={1.5} />
                      {item.autoDeduct ? "Active" : "Off"}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
