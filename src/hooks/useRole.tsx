import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "manager" | "staff";

interface RoleState {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  staffRecordId: string | null;
}

export function useRole(): RoleState {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [staffRecordId, setStaffRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setStaffRecordId(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);

      // Fetch role from shop_members table (replaces user_roles)
      const { data: memberData } = await supabase
        .from("shop_members")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const userRole = (memberData?.role as AppRole) || null;
      setRole(userRole);

      // If staff, find linked staff record
      if (userRole === "staff") {
        const { data: staffData } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        setStaffRecordId(staffData?.id || null);
      } else {
        setStaffRecordId(null);
      }

      setLoading(false);
    };

    fetchRole();
  }, [user?.id]);

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isStaff: role === "staff",
    staffRecordId,
  };
}
