import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/hooks/useShop";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ProtectedRoute() {
  const { session, loading: authLoading } = useAuth();
  const { hasShop, loading: shopLoading, refetch } = useShop();
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [inviteHandled, setInviteHandled] = useState(false);

  useEffect(() => {
    if (!session || shopLoading || hasShop || inviteHandled) return;

    const pendingCode = localStorage.getItem("pending_invite_code");
    if (!pendingCode) {
      setInviteHandled(true);
      return;
    }

    const accept = async () => {
      setAcceptingInvite(true);
      try {
        const { error } = await supabase.rpc("accept_invitation", {
          _invite_code: pendingCode,
        });
        if (error) throw error;
        localStorage.removeItem("pending_invite_code");
        toast.success("Welcome to the team!");
        refetch();
      } catch (e: any) {
        console.error("Failed to accept invitation:", e);
        localStorage.removeItem("pending_invite_code");
        toast.error(e.message || "Failed to accept invitation");
      } finally {
        setAcceptingInvite(false);
        setInviteHandled(true);
      }
    };
    accept();
  }, [session, shopLoading, hasShop, inviteHandled, refetch]);

  if (authLoading || (session && shopLoading) || acceptingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        {acceptingInvite && (
          <p className="text-sm text-muted-foreground">Linking your account to the salon…</p>
        )}
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasShop) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
