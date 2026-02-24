import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Palette, Layout, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DESIGN_STYLES = [
  { id: "minimal", label: "Minimal", description: "Clean lines, white space" },
  { id: "industrial", label: "Industrial", description: "Raw textures, dark tones" },
  { id: "luxury", label: "Luxury", description: "Gold accents, rich palette" },
];

const BRAND_COLORS = [
  "0 0% 9%",
  "220 70% 50%",
  "340 65% 47%",
  "145 63% 42%",
  "25 80% 50%",
  "280 60% 50%",
];

export default function SettingsPage() {
  const [shopName, setShopName] = useState("Studio Beauty");
  const [selectedStyle, setSelectedStyle] = useState("minimal");
  const [selectedColor, setSelectedColor] = useState(BRAND_COLORS[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-3xl"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Booking Page Builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your client-facing booking widget</p>
      </div>

      {/* Shop Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Shop Name</label>
        <Input
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="rounded-xl max-w-sm"
        />
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Logo</label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
            <Upload className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Upload your logo</p>
            <p className="text-xs mt-0.5">PNG or SVG, max 2MB</p>
          </div>
        </div>
      </div>

      {/* Brand Color */}
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
              className={cn(
                "h-10 w-10 rounded-xl transition-all",
                selectedColor === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"
              )}
              style={{ backgroundColor: `hsl(${color})` }}
            />
          ))}
        </div>
      </div>

      {/* Design Style */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Layout className="h-4 w-4" strokeWidth={1.5} />
          Design Style
        </label>
        <div className="grid grid-cols-3 gap-3">
          {DESIGN_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                selectedStyle === style.id
                  ? "border-primary bg-primary/5 shadow-apple"
                  : "border-border hover:border-primary/30"
              )}
            >
              <p className="text-sm font-medium">{style.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{style.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Preview</label>
        <div className="rounded-2xl border border-border bg-card shadow-apple-lg p-8 text-center space-y-4">
          <div
            className="h-12 w-12 mx-auto rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg"
            style={{ backgroundColor: `hsl(${selectedColor})` }}
          >
            {shopName.charAt(0)}
          </div>
          <h2 className="text-xl font-semibold">{shopName}</h2>
          <p className="text-sm text-muted-foreground">Book your appointment</p>
          <Button
            className="rounded-xl px-8"
            style={{ backgroundColor: `hsl(${selectedColor})` }}
          >
            Book Now
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button className="rounded-xl gap-2">
          Save Changes
        </Button>
        <Button variant="outline" className="rounded-xl gap-2" asChild>
          <a href="/book" target="_blank">
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
            Open Booking Page
          </a>
        </Button>
      </div>
    </motion.div>
  );
}
