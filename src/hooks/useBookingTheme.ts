import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_THEME, type ThemeSettings } from "@/components/settings/ThemePresets";

/**
 * Fetches theme_settings for a given shop and injects them as CSS variables
 * on a target container element (or document root as fallback).
 */
export function useBookingTheme(shopId: string | null) {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("shops")
        .select("theme_settings")
        .eq("id", shopId)
        .single();
      if (data?.theme_settings) {
        setTheme({ ...DEFAULT_THEME, ...(data.theme_settings as unknown as ThemeSettings) });
      }
      setLoaded(true);
    };
    fetch();
  }, [shopId]);

  return { theme, loaded };
}
