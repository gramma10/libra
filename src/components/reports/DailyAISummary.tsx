import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, CalendarIcon } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Period = "day" | "week" | "month";

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm leading-relaxed text-foreground/90 mb-2 last:mb-0">
        {parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{p}</span>
          )
        )}
      </p>
    );
  });
}

function formatRangeLabel(date: Date, period: Period, locale: string) {
  const dfmt = locale === "el" ? "d MMM yyyy" : "MMM d, yyyy";
  if (period === "day") return format(date, dfmt);
  if (period === "week") {
    const s = startOfWeek(date, { weekStartsOn: 1 });
    const e = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(s, "d MMM")} – ${format(e, dfmt)}`;
  }
  const s = startOfMonth(date);
  const e = endOfMonth(date);
  return `${format(s, "d")} – ${format(e, dfmt)}`;
}

export default function DailyAISummary() {
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [period, setPeriod] = useState<Period>("day");
  const [date, setDate] = useState<Date>(new Date());
  const [popoverOpen, setPopoverOpen] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const isoDate = format(date, "yyyy-MM-dd");
      const { data, error } = await supabase.functions.invoke("daily-revenue-summary", {
        body: { date: isoDate, period, language: locale },
      });
      if (error) {
        const status = (error as any).context?.status;
        if (status === 429) {
          toast({ title: t("aiSummary.rateLimit"), variant: "destructive" });
        } else if (status === 402) {
          toast({ title: t("aiSummary.creditsExhausted"), variant: "destructive" });
        } else {
          toast({ title: t("aiSummary.error"), description: error.message, variant: "destructive" });
        }
        return;
      }
      if (data?.error) {
        toast({ title: t("aiSummary.error"), description: data.error, variant: "destructive" });
        return;
      }
      setSummary(data?.summary || "");
    } catch (e: any) {
      toast({ title: t("aiSummary.error"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-apple"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="rounded-xl p-2 bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("aiSummary.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("aiSummary.subtitle")}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={summary ? "outline" : "default"}
          onClick={generate}
          disabled={loading}
          className="rounded-xl gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : summary ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {summary ? t("aiSummary.regenerate") : t("aiSummary.generate")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-9 rounded-xl">
            <TabsTrigger value="day" className="rounded-lg text-xs px-3">
              {t("aiSummary.period.day")}
            </TabsTrigger>
            <TabsTrigger value="week" className="rounded-lg text-xs px-3">
              {t("aiSummary.period.week")}
            </TabsTrigger>
            <TabsTrigger value="month" className="rounded-lg text-xs px-3">
              {t("aiSummary.period.month")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("rounded-xl gap-2 h-9 font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {formatRangeLabel(date, period, locale)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  setDate(d);
                  setPopoverOpen(false);
                }
              }}
              disabled={(d) => d > new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading && !summary && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("aiSummary.thinking")}
        </div>
      )}

      {summary && (
        <div className="rounded-xl bg-background/60 border border-border/50 p-4 mt-2">
          {renderMarkdown(summary)}
        </div>
      )}

      {!summary && !loading && (
        <p className="text-xs text-muted-foreground italic mt-1">
          {t("aiSummary.empty")}
        </p>
      )}
    </motion.div>
  );
}
