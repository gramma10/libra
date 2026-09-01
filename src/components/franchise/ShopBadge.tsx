import { Badge } from "@/components/ui/badge";
import { useShop } from "@/hooks/useShop";
import { ALL_SCOPE } from "@/lib/shopScope";
import { cn } from "@/lib/utils";

interface ShopBadgeProps {
  shopId: string | null | undefined;
  className?: string;
  /**
   * Force render even when not in franchise ALL scope. Useful in cases where
   * the page intentionally wants the badge visible (e.g. a per-shop low-stock
   * banner showing shop names regardless of current scope).
   */
  always?: boolean;
}

export function ShopBadge({ shopId, className, always }: ShopBadgeProps) {
  const { isFranchise, scope, memberships } = useShop();

  if (!always) {
    if (!isFranchise) return null;
    if (scope !== ALL_SCOPE) return null;
  }

  if (!shopId) return null;
  const name = memberships.find((m) => m.shopId === shopId)?.shop.name ?? "";
  if (!name) return null;

  return (
    <Badge variant="outline" className={cn("font-normal", className)}>
      {name}
    </Badge>
  );
}
