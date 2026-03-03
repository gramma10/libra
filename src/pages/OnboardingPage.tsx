import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/hooks/useShop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { hasShop, refetch } = useShop();
  const [step, setStep] = useState(0);
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  if (!session) {
    navigate("/auth", { replace: true });
    return null;
  }

  if (hasShop) {
    navigate("/", { replace: true });
    return null;
  }

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "my-shop";

  const handleCreate = async () => {
    if (!shopName.trim()) {
      toast.error("Please enter your shop name");
      return;
    }

    setLoading(true);
    const slug = generateSlug(shopName) + "-" + Date.now().toString(36);

    const { error } = await supabase.rpc("create_shop", {
      _name: shopName.trim(),
      _slug: slug,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Your shop is ready!");
    refetch();
    navigate("/", { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Store className="h-6 w-6 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Set up your shop</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Let's get your business ready in seconds
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-apple-lg p-6 space-y-5">
          {step === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Shop Name</label>
                <Input
                  placeholder="e.g. Studio Luxe"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="rounded-xl"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address (optional)</label>
                <Input
                  placeholder="e.g. 123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button
                className="w-full rounded-xl gap-2"
                onClick={handleCreate}
                disabled={loading || !shopName.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Create Shop
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
