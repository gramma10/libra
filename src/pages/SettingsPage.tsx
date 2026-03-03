import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, LogOut, MessageSquare, Send, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import OperatingHoursEditor, { type DayHours } from "@/components/settings/OperatingHoursEditor";
import BookingThemeEditor from "@/components/settings/BookingThemeEditor";

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
  const { shopId } = useShop();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [apifonSenderId, setApifonSenderId] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [operatingHours, setOperatingHours] = useState<DayHours[]>(DEFAULT_HOURS);

  const handleSendTestSms = async () => {
    if (!testPhone) { toast.error("Please enter a phone number"); return; }
    setSendingTest(true);
    const { data, error } = await supabase.functions.invoke("send-apifon-sms", {
      body: { to: testPhone, senderId: apifonSenderId || "SALON", text: "Test SMS from your salon. Your reminder system is working!" },
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
        setSmsEnabled(data.sms_enabled || false);
        setApifonSenderId(data.apifon_sender_id || "");
        if (data.operating_hours) {
          setOperatingHours(data.operating_hours as unknown as DayHours[]);
        }
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const invalid = operatingHours.find((h) => !h.isClosed && h.open >= h.close);
    if (invalid) {
      toast.error(`${invalid.day}: closing time must be after opening time`);
      return;
    }

    setSaving(true);
    const payload = {
      sms_enabled: smsEnabled,
      apifon_sender_id: apifonSenderId,
      operating_hours: operatingHours as any,
    };

    if (settingsId) {
      const { error } = await supabase.from("business_settings").update(payload).eq("id", settingsId);
      if (error) toast.error(error.message);
      else toast.success("Settings saved successfully");
    } else {
      const { error } = await supabase.from("business_settings").insert({ ...payload, shop_id: shopId! });
      if (error) toast.error(error.message);
      else toast.success("Settings created");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your business &amp; booking experience</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="rounded-xl mb-6">
          <TabsTrigger value="general" className="rounded-lg">General</TabsTrigger>
          <TabsTrigger value="booking-theme" className="rounded-lg">Booking Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8 max-w-3xl">
          {/* Operating Hours */}
          <Card className="rounded-2xl shadow-apple">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5" strokeWidth={1.5} />Operating Hours</CardTitle>
              <CardDescription>Set your weekly opening &amp; closing times</CardDescription>
            </CardHeader>
            <CardContent>
              <OperatingHoursEditor hours={operatingHours} onChange={setOperatingHours} />
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

          <Button className="rounded-xl gap-2" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </TabsContent>

        <TabsContent value="booking-theme">
          <BookingThemeEditor />
        </TabsContent>
      </Tabs>

      <div className="border-t border-border pt-6">
        <Button variant="outline" className="rounded-xl gap-2 text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign Out
        </Button>
      </div>
    </motion.div>
  );
}
