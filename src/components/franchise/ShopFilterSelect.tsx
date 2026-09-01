import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShop } from "@/hooks/useShop";
import { ALL_SCOPE, type ShopScope } from "@/lib/shopScope";
import { useLanguage } from "@/hooks/useLanguage";

interface ShopFilterSelectProps {
  value: ShopScope;
  onChange: (value: ShopScope) => void;
  /** When true, omits the "All shops" option (use for create-dialog shop pickers). */
  requireSpecific?: boolean;
  /** When true, render even for non-franchise users. Default: only render in franchise mode. */
  always?: boolean;
  className?: string;
  placeholder?: string;
}

export function ShopFilterSelect({
  value,
  onChange,
  requireSpecific,
  always,
  className,
  placeholder,
}: ShopFilterSelectProps) {
  const { isFranchise, adminShops, memberships } = useShop();
  const { t } = useLanguage();

  if (!always && !isFranchise) return null;

  const shops = adminShops.length > 0 ? adminShops : memberships.map((m) => m.shop);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ShopScope)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder ?? t("franchise.selectShop")} />
      </SelectTrigger>
      <SelectContent>
        {!requireSpecific && <SelectItem value={ALL_SCOPE}>{t("franchise.allShops")}</SelectItem>}
        {shops.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
