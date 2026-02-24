import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Palette, Layout, ExternalLink, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const BRAND_COLORS = [
  "0 0% 9%",
  "220 70% 50%",
  "340 65% 47%",
  "145 63% 42%",
  "25 80% 50%",
  "280 60% 50%",
];

const THEME_STYLES = ["Minimal", "Industrial", "Modern", "Classic"] as const;

export default function SettingsPage() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("Minimal");
  const [selectedColor, setSelectedColor] = useState(BRAND_COLORS[0]);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("business_settings").select("*").limit(1).single();
      if (data) {
        setSettingsId(data.id);
        setShopName(data.shop_name);
        setSelectedStyle(data.theme_style);
        setGoogleReviewUrl(data.google_review_url || "");
        // Try to match brand color
        const hslMatch = BRAND_COLORS.find((c) => `hsl(${c})` === data.brand_color_primary || `#${c}` === data.brand_color_primary);
        if (hslMatch) setSelectedColor(hslMatch);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      shop_name: shopName,
      brand_color_primary: `hsl(${selectedColor})`,
      theme_style: selectedStyle as any,
      google_review_url: googleReviewUrl,
    };

    if (settingsId) {
      const { error } = await supabase.from("business_settings").update(payload).eq("id", settingsId);
      if (error) toast.error(error.message);
      else toast.success("Settings saved");
    } else {
      const { error } = await supabase.from("business_settings").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Settings created");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your booking widget & business</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Shop Name</label>
        <Input value={shopName} onChange={(e) => setShopName(e.target.value)} className="rounded-xl max-w-sm" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Google Review URL</label>
        <Input value={googleReviewUrl} onChange={(e) => setGoogleReviewUrl(e.target.value)} className="rounded-xl max-w-sm" placeholder="https://g.page/..." />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" strokeWidth={1.5} />
          Brand Color
        </label>
        <div className="flex gap-3">
          {BRAND_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={cn("h-10 w-10 rounded-xl transition-all", selectedColor === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105")}
              style={{ backgroundColor: `hsl(${color})` }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Layout className="h-4 w-4" strokeWidth={1.5} />
          Design Style
        </label>
        <div className="grid grid-cols-4 gap-3">
          {THEME_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                selectedStyle === style ? "border-primary bg-primary/5 shadow-apple" : "border-border hover:border-primary/30"
              )}
            >
              <p className="text-sm font-medium">{style}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Preview</label>
        <div className="rounded-2xl border border-border bg-card shadow-apple-lg p-8 text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg" style={{ backgroundColor: `hsl(${selectedColor})` }}>
            {shopName.charAt(0) || "S"}
          </div>
          <h2 className="text-xl font-semibold">{shopName || "Your Shop"}</h2>
          <p className="text-sm text-muted-foreground">Book your appointment</p>
          <Button className="rounded-xl px-8" style={{ backgroundColor: `hsl(${selectedColor})` }}>Book Now</Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button className="rounded-xl gap-2" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button variant="outline" className="rounded-xl gap-2" asChild>
          <a href="/book" target="_blank">
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
            Open Booking Page
          </a>
        </Button>
      </div>

      <div className="border-t border-border pt-6">
        <Button variant="outline" className="rounded-xl gap-2 text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign Out
        </Button>
      </div>
    </motion.div>
  );
}
