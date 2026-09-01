import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShop } from "@/hooks/useShop";
import { ALL_SCOPE } from "@/lib/shopScope";
import { useLanguage } from "@/hooks/useLanguage";

export function ShopSwitcher() {
  const { adminShops, scope, setScope } = useShop();
  const { t } = useLanguage();

  return (
    <Select value={scope} onValueChange={(v) => setScope(v)}>
      <SelectTrigger
        aria-label={t("franchise.switchShop")}
        className="h-9 w-full border-0 bg-transparent px-0 text-base font-semibold shadow-none focus:ring-0 focus:ring-offset-0 [&>span]:truncate"
      >
        <SelectValue placeholder={t("franchise.franchiseOverview")} />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value={ALL_SCOPE}>{t("franchise.franchiseOverview")}</SelectItem>
        {adminShops.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
