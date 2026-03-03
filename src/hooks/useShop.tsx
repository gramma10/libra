import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ShopContextType {
  shopId: string | null;
  shopName: string;
  shopSlug: string;
  hasShop: boolean;
  loading: boolean;
  refetch: () => void;
}

const ShopContext = createContext<ShopContextType>({
  shopId: null,
  shopName: "",
  shopSlug: "",
  hasShop: false,
  loading: true,
  refetch: () => {},
});

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<ShopContextType, "refetch">>({
    shopId: null,
    shopName: "",
    shopSlug: "",
    hasShop: false,
    loading: true,
  });

  const fetchShop = useCallback(async () => {
    if (!user) {
      setState({ shopId: null, shopName: "", shopSlug: "", hasShop: false, loading: false });
      return;
    }

    const { data: member } = await supabase
      .from("shop_members")
      .select("shop_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      setState({ shopId: null, shopName: "", shopSlug: "", hasShop: false, loading: false });
      return;
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("name, slug")
      .eq("id", member.shop_id)
      .single();

    setState({
      shopId: member.shop_id,
      shopName: shop?.name || "",
      shopSlug: shop?.slug || "",
      hasShop: true,
      loading: false,
    });
  }, [user?.id]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  return (
    <ShopContext.Provider value={{ ...state, refetch: fetchShop }}>
      {children}
    </ShopContext.Provider>
  );
}

export const useShop = () => useContext(ShopContext);
