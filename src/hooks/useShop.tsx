import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ALL_SCOPE, type ShopScope } from "@/lib/shopScope";

export type ShopRole = "admin" | "manager" | "staff";

export interface ShopSummary {
  id: string;
  name: string;
  slug: string;
}

export interface ShopMembership {
  shopId: string;
  role: ShopRole;
  shop: ShopSummary;
}

interface ShopContextType {
  // Legacy fields (kept for backward compatibility)
  shopId: string | null;
  shopName: string;
  shopSlug: string;
  hasShop: boolean;
  loading: boolean;
  refetch: () => void;

  // Franchise-aware fields
  memberships: ShopMembership[];
  adminShops: ShopSummary[];
  isFranchise: boolean;
  scope: ShopScope;
  setScope: (scope: ShopScope) => void;
  activeShop: ShopSummary | null;
  activeShopIds: string[];
}

const SCOPE_STORAGE_KEY = "studioflow.scope";

const ShopContext = createContext<ShopContextType>({
  shopId: null,
  shopName: "",
  shopSlug: "",
  hasShop: false,
  loading: true,
  refetch: () => {},
  memberships: [],
  adminShops: [],
  isFranchise: false,
  scope: ALL_SCOPE,
  setScope: () => {},
  activeShop: null,
  activeShopIds: [],
});

function readPersistedScope(): ShopScope | null {
  try {
    const v = localStorage.getItem(SCOPE_STORAGE_KEY);
    return v ? (v as ShopScope) : null;
  } catch {
    return null;
  }
}

function persistScope(scope: ShopScope) {
  try {
    localStorage.setItem(SCOPE_STORAGE_KEY, scope);
  } catch {
    // ignore (private mode etc.)
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [memberships, setMemberships] = useState<ShopMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScopeState] = useState<ShopScope>(ALL_SCOPE);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("shop_members")
      .select("shop_id, role, shops!shop_members_shop_id_fkey(id, name, slug)")
      .eq("user_id", user.id);

    if (error || !data) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const next: ShopMembership[] = data
      .map((row) => {
        const shop = (row as { shops: ShopSummary | null }).shops;
        if (!shop) return null;
        return {
          shopId: row.shop_id as string,
          role: row.role as ShopRole,
          shop: { id: shop.id, name: shop.name ?? "", slug: shop.slug ?? "" },
        };
      })
      .filter((m): m is ShopMembership => m !== null);

    setMemberships(next);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const adminShops = useMemo<ShopSummary[]>(
    () => memberships.filter((m) => m.role === "admin").map((m) => m.shop),
    [memberships],
  );

  const isFranchise = adminShops.length >= 2;

  // Resolve initial scope after memberships load
  useEffect(() => {
    if (loading) return;
    if (memberships.length === 0) {
      setScopeState(ALL_SCOPE);
      return;
    }
    const persisted = readPersistedScope();
    const validIds = new Set(memberships.map((m) => m.shopId));
    if (persisted && (persisted === ALL_SCOPE ? isFranchise : validIds.has(persisted))) {
      setScopeState(persisted);
      return;
    }
    // Default: 'ALL' for franchise admins, single shop id otherwise
    if (isFranchise) {
      setScopeState(ALL_SCOPE);
      persistScope(ALL_SCOPE);
    } else {
      const only = memberships[0].shopId;
      setScopeState(only);
      persistScope(only);
    }
  }, [loading, memberships, isFranchise]);

  const setScope = useCallback(
    (next: ShopScope) => {
      setScopeState(next);
      persistScope(next);
      // Drop all cached query data so single-shop and franchise data don't bleed.
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const activeShopIds = useMemo<string[]>(() => {
    if (scope === ALL_SCOPE) return adminShops.map((s) => s.id);
    return memberships.some((m) => m.shopId === scope) ? [scope] : [];
  }, [scope, adminShops, memberships]);

  const activeShop = useMemo<ShopSummary | null>(() => {
    if (scope === ALL_SCOPE) return null;
    return memberships.find((m) => m.shopId === scope)?.shop ?? null;
  }, [scope, memberships]);

  // Legacy compatibility: when scope is specific, expose its id/name/slug.
  // When scope is 'ALL' for a franchise admin, callers using `shopId` should
  // be upgraded; we return null so misuse surfaces during development.
  const legacyShopId = scope === ALL_SCOPE ? null : scope;
  const legacyShopName = activeShop?.name ?? "";
  const legacyShopSlug = activeShop?.slug ?? "";

  const value: ShopContextType = {
    shopId: legacyShopId,
    shopName: legacyShopName,
    shopSlug: legacyShopSlug,
    hasShop: memberships.length > 0,
    loading,
    refetch: fetchShop,
    memberships,
    adminShops,
    isFranchise,
    scope,
    setScope,
    activeShop,
    activeShopIds,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export const useShop = () => useContext(ShopContext);
