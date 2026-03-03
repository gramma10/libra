import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Palette, Loader2, Smartphone, Check, ChevronRight, User, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemeSettings, DEFAULT_THEME, THEME_PRESETS, FONT_OPTIONS } from "./ThemePresets";

export default function BookingThemeEditor() {
  const { shopId } = useShop();
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    const fetch = async () => {
      const { data } = await supabase.from("shops").select("theme_settings").eq("id", shopId).single();
      if (data?.theme_settings) {
        setTheme({ ...DEFAULT_THEME, ...(data.theme_settings as unknown as ThemeSettings) });
      }
      setLoading(false);
    };
    fetch();
  }, [shopId]);

  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true);
    const { error } = await supabase.from("shops").update({ theme_settings: theme as any }).eq("id", shopId);
    if (error) toast.error(error.message);
    else toast.success("Theme saved!");
    setSaving(false);
  };

  const radiusNum = parseFloat(theme.border_radius) || 0.5;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Controls */}
      <div className="space-y-6">
        {/* Presets */}
        <Card className="rounded-2xl shadow-apple">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Theme Presets</CardTitle>
            <CardDescription className="text-xs">Quick-start with a preset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setTheme(preset.theme)}
                  className="rounded-xl border border-border p-3 text-left transition-all hover:border-primary/30 hover:shadow-apple"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: preset.theme.primary_color }} />
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: preset.theme.background_color }} />
                  </div>
                  <p className="text-xs font-medium">{preset.name}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="rounded-2xl shadow-apple">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" />Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              ["Primary", "primary_color"],
              ["Background", "background_color"],
              ["Text", "text_color"],
            ] as const).map(([label, key]) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm font-medium">{label}</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                    className="h-9 w-12 p-1 rounded-lg cursor-pointer border-border"
                  />
                  <Input
                    value={theme[key]}
                    onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                    className="rounded-lg w-24 h-9 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Typography & Radius */}
        <Card className="rounded-2xl shadow-apple">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Typography & Shape</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Font Family</label>
              <Select value={theme.font_family} onValueChange={(v) => setTheme({ ...theme, font_family: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Border Radius: {radiusNum.toFixed(2)}rem</label>
              <Slider
                value={[radiusNum]}
                min={0}
                max={2}
                step={0.05}
                onValueChange={([v]) => setTheme({ ...theme, border_radius: `${v}rem` })}
                className="py-2"
              />
            </div>
          </CardContent>
        </Card>

        <Button className="rounded-xl gap-2" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Theme
        </Button>
      </div>

      {/* Live Mobile Preview */}
      <div className="flex justify-center lg:sticky lg:top-8 self-start">
        <div className="w-[320px]">
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" />Live Preview</p>
          <div
            className="rounded-[2rem] border-[6px] border-foreground/80 overflow-hidden shadow-apple-lg"
            style={{
              "--bte-primary": theme.primary_color,
              "--bte-bg": theme.background_color,
              "--bte-text": theme.text_color,
              "--bte-font": theme.font_family,
              "--bte-radius": theme.border_radius,
            } as React.CSSProperties}
          >
            {/* Status bar mock */}
            <div className="h-6 flex items-center justify-between px-5 text-[10px] font-semibold" style={{ backgroundColor: theme.background_color, color: theme.text_color }}>
              <span>9:41</span>
              <div className="flex gap-1">
                <div className="h-2.5 w-4 rounded-sm border" style={{ borderColor: theme.text_color }} />
              </div>
            </div>
            {/* Content */}
            <div className="min-h-[500px] p-5 space-y-5" style={{ backgroundColor: theme.background_color, color: theme.text_color, fontFamily: theme.font_family }}>
              {/* Logo area */}
              <div className="text-center space-y-2 pt-2">
                <div
                  className="h-12 w-12 mx-auto flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: theme.primary_color, borderRadius: theme.border_radius }}
                >
                  S
                </div>
                <h2 className="text-lg font-semibold" style={{ color: theme.text_color }}>Your Salon</h2>
                <p className="text-xs opacity-60">Book an appointment</p>
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 transition-all"
                    style={{
                      width: i === 0 ? "1.5rem" : "0.4rem",
                      borderRadius: "9999px",
                      backgroundColor: i === 0 ? theme.primary_color : `${theme.text_color}22`,
                    }}
                  />
                ))}
              </div>

              {/* Fake service cards */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Choose a service</p>
                {["Classic Haircut", "Beard Trim", "Full Color"].map((name, i) => (
                  <div
                    key={name}
                    className={cn("flex items-center justify-between p-3 border transition-all", i === 0 && "border-2")}
                    style={{
                      borderRadius: theme.border_radius,
                      borderColor: i === 0 ? theme.primary_color : `${theme.text_color}22`,
                      backgroundColor: i === 0 ? `${theme.primary_color}08` : "transparent",
                    }}
                  >
                    <div>
                      <p className="text-xs font-medium">{name}</p>
                      <p className="text-[10px] opacity-50">{[30, 20, 90][i]} min</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">€{[25, 15, 80][i]}</span>
                      <ChevronRight className="h-3 w-3 opacity-40" />
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <button
                className="w-full py-2.5 text-sm font-medium text-white"
                style={{
                  backgroundColor: theme.primary_color,
                  borderRadius: theme.border_radius,
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
