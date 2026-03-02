import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Layout, ExternalLink, Loader2, LogOut, MessageSquare, Send, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import LogoUploader from "@/components/settings/LogoUploader";
import OperatingHoursEditor, { type DayHours } from "@/components/settings/OperatingHoursEditor";

const BRAND_COLORS = [
  "0 0% 9%",
  "220 70% 50%",
  "340 65% 47%",
  "145 63% 42%",
  "25 80% 50%",
  "280 60% 50%",
];

const THEME_STYLES = ["Minimal", "Industrial", "Modern", "Classic"] as const;

const DEFAULT_HOURS: DayHours[] = [
  { day: "Monday", open: "09:00", close: "20:00", isClosed: false },
  { day: "Tuesday", open: "09:00", close: "20:00", isClosed: false },
  { day: "Wednesday", open: "09:00", close: "20:00", isClosed: false },
  { day: "Thursday", open: "09:00", close: "20:00", isClosed: false },
  { day: "Friday", open: "09:00", close: "20:00", isClosed: false },
  { day: "Saturday", open: "09:00", close: "17:00", isClosed: false },
  { day: "Sunday", open: "09:00", close: "17:00", isClosed: true },
];

export default function SettingsPage() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("Minimal");
  const [selectedColor, setSelectedColor] = useState(BRAND_COLORS[0]);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [apifonSenderId, setApifonSenderId] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [operatingHours, setOperatingHours] = useState<DayHours[]>(DEFAULT_HOURS);

  const handleSendTestSms = async () => {
    if (!testPhone) { toast.error("Please enter a phone number"); return; }
    setSendingTest(true);
    const { data, error } = await supabase.functions.invoke("send-apifon-sms", {
      body: { to: testPhone, senderId: apifonSenderId || "SALON", text: `Test SMS from ${shopName || "your salon"}. Your reminder system is working!` },
    });
    if (error) toast.error("Failed to send: " + error.message);
    else if (data?.error) toast.error(`SMS failed: ${data.error} (${data.details || "no details"})`);
    else toast.success("Test SMS sent successfully!");
    setSendingTest(false);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("business_settings").select("*").limit(1).single();
      if (data) {
        setSettingsId(data.id);
        setShopName(data.shop_name);
        setSelectedStyle(data.theme_style);
        setGoogleReviewUrl(data.google_review_url || "");
        setSmsEnabled(data.sms_enabled || false);
        setApifonSenderId(data.apifon_sender_id || "");
        setLogoUrl(data.logo_url || "");
        if (data.operating_hours) {
          setOperatingHours(data.operating_hours as unknown as DayHours[]);
        }
        const hslMatch = BRAND_COLORS.find((c) => `hsl(${c})` === data.brand_color_primary);
        if (hslMatch) setSelectedColor(hslMatch);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    // Validate hours: open days must have valid times
    const invalid = operatingHours.find((h) => !h.isClosed && h.open >= h.close);
    if (invalid) {
      toast.error(`${invalid.day}: closing time must be after opening time`);
      return;
    }

    setSaving(true);
    const payload = {
      shop_name: shopName,
      brand_color_primary: `hsl(${selectedColor})`,
      theme_style: selectedStyle as any,
      google_review_url: googleReviewUrl,
      sms_enabled: smsEnabled,
      apifon_sender_id: apifonSenderId,
      logo_url: logoUrl,
      operating_hours: operatingHours as any,
    };

    if (settingsId) {
      const { error } = await supabase.from("business_settings").update(payload).eq("id", settingsId);
      if (error) toast.error(error.message);
      else toast.success("Settings saved successfully");
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

      {/* Business Profile Card */}
      <Card className="rounded-2xl shadow-apple">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Store className="h-5 w-5" strokeWidth={1.5} />Business Profile</CardTitle>
          <CardDescription>Logo, name and operating hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUploader logoUrl={logoUrl} onLogoChange={setLogoUrl} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Shop Name</label>
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} className="rounded-xl max-w-sm" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Google Review URL</label>
            <Input value={googleReviewUrl} onChange={(e) => setGoogleReviewUrl(e.target.value)} className="rounded-xl max-w-sm" placeholder="https://g.page/..." />
          </div>

          <OperatingHoursEditor hours={operatingHours} onChange={setOperatingHours} />
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card className="rounded-2xl shadow-apple">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" strokeWidth={1.5} />Appearance</CardTitle>
          <CardDescription>Brand color and design style</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Brand Color</label>
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
        </CardContent>
      </Card>

      {/* SMS Card */}
      <Card className="rounded-2xl shadow-apple">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="h-5 w-5" strokeWidth={1.5} />SMS Reminders</CardTitle>
          <CardDescription>24h appointment reminder via Apifon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable SMS Reminders</p>
              <p className="text-xs text-muted-foreground">Send automatic reminders ~1 hour before appointments</p>
            </div>
            <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Apifon Sender ID</label>
            <Input value={apifonSenderId} onChange={(e) => setApifonSenderId(e.target.value)} className="rounded-xl max-w-sm" placeholder="SALON" />
            <p className="text-xs text-muted-foreground">The name recipients see (max 11 chars)</p>
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <label className="text-sm font-medium">Send Test SMS</label>
            <div className="flex gap-2 max-w-sm">
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="rounded-xl" placeholder="+30 697 000 0000" />
              <Button variant="outline" className="rounded-xl gap-2 shrink-0" onClick={handleSendTestSms} disabled={sendingTest}>
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Preview</label>
        <div className="rounded-2xl border border-border bg-card shadow-apple-lg p-8 text-center space-y-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-14 w-14 mx-auto rounded-2xl object-cover" />
          ) : (
            <div className="h-14 w-14 mx-auto rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg" style={{ backgroundColor: `hsl(${selectedColor})` }}>
              {shopName.charAt(0) || "S"}
            </div>
          )}
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
