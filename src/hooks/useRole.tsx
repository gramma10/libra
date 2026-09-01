import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShop, type ShopRole } from "@/hooks/useShop";
import { ALL_SCOPE } from "@/lib/shopScope";

export type AppRole = ShopRole;

interface RoleState {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  staffRecordId: string | null;
  roleFor: (shopId: string | null | undefined) => AppRole | null;
}

export function useRole(): RoleState {
  const { user } = useAuth();
  const { memberships, scope, loading: shopLoading } = useShop();
  const [staffRecordId, setStaffRecordId] = useState<string | null>(null);
  const [staffLoading, setStaffLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStaffRecordId(null);
      setStaffLoading(false);
      return;
    }
    let cancelled = false;
    setStaffLoading(true);
    supabase
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStaffRecordId(data?.id ?? null);
        setStaffLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const roleMap = useMemo<Record<string, AppRole>>(() => {
    const m: Record<string, AppRole> = {};
    for (const x of memberships) m[x.shopId] = x.role;
    return m;
  }, [memberships]);

  const roleFor = useCallback(
    (shopId: string | null | undefined) => (shopId ? roleMap[shopId] ?? null : null),
    [roleMap],
  );

  // For the legacy `role` / `isAdmin` shape: in franchise scope='ALL', report
  // the highest privilege the user holds in any of their shops. For a specific
  // scope, report their role in that shop.
  const role: AppRole | null = useMemo(() => {
    if (memberships.length === 0) return null;
    if (scope === ALL_SCOPE) {
      if (memberships.some((m) => m.role === "admin")) return "admin";
      if (memberships.some((m) => m.role === "manager")) return "manager";
      return memberships[0].role;
    }
    return roleMap[scope] ?? null;
  }, [memberships, scope, roleMap]);

  return {
    role,
    loading: shopLoading || staffLoading,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isStaff: role === "staff",
    staffRecordId,
    roleFor,
  };
}
