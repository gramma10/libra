import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SellProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; product_name: string; current_stock: number; retail_price: number } | null;
  onSuccess: () => void;
}

export default function SellProductDialog({ open, onOpenChange, product, onSuccess }: SellProductDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  if (!product) return null;

  const total = quantity * Number(product.retail_price);

  const handleSell = async () => {
    if (quantity <= 0) { toast.error("Quantity must be greater than 0"); return; }
    if (quantity > product.current_stock) { toast.error("Quantity exceeds available stock"); return; }

    setSaving(true);

    // 1. Create product sale record
    const { error: saleError } = await supabase.from("product_sales").insert({
      inventory_id: product.id,
      quantity,
      unit_price: Number(product.retail_price),
      total_amount: total,
      sale_date: saleDate,
    });

    if (saleError) { toast.error(saleError.message); setSaving(false); return; }

    // 2. Decrement stock
    const { error: stockError } = await supabase
      .from("inventory")
      .update({ current_stock: product.current_stock - quantity })
      .eq("id", product.id);

    if (stockError) { toast.error(stockError.message); setSaving(false); return; }

    toast.success(`Sold ${quantity}x ${product.product_name} for €${total.toFixed(2)}`);
    setQuantity(1);
    onOpenChange(false);
    onSuccess();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle>Sell: {product.product_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Available stock: <span className="font-semibold text-foreground">{product.current_stock}</span> · Retail price: <span className="font-semibold text-foreground">€{Number(product.retail_price).toFixed(2)}</span></p>
          <div className="space-y-1">
            <label className="text-sm font-medium">Quantity</label>
            <Input type="number" min={1} max={product.current_stock} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Sale Date</label>
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="rounded-xl" />
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold text-foreground">€{total.toFixed(2)}</p>
          </div>
          <Button className="w-full rounded-xl" onClick={handleSell} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirm Sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
