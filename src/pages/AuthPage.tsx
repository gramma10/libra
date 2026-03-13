import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Mail, Lock, Loader2, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

export default function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate("/", { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcomeBack"));
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success(t("auth.checkEmail"));
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <button
        onClick={() => setLanguage(language === "en" ? "el" : "en")}
        className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground border border-border"
      >
        <Globe className="h-4 w-4" strokeWidth={1.5} />
        {language === "en" ? "EL" : "EN"}
      </button>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Scissors className="h-6 w-6 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("auth.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? t("auth.signInSubtitle") : t("auth.signUpSubtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card shadow-apple-lg p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("auth.email")}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("auth.password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 rounded-xl"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLogin ? t("auth.signIn") : t("auth.signUp")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-foreground font-medium hover:underline"
            >
              {isLogin ? t("auth.signUp") : t("auth.signIn")}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
