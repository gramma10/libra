import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/hooks/useShop";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ForcePasswordChange from "@/components/ForcePasswordChange";

export default function ProtectedRoute() {
  const { session, loading: authLoading, user } = useAuth();
  const { hasShop, loading: shopLoading } = useShop();
  const [passwordChanged, setPasswordChanged] = useState(false);

  if (authLoading || (session && shopLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasShop) {
    return <Navigate to="/onboarding" replace />;
  }

  // Force password change for staff created by admin
  const requiresChange = user?.user_metadata?.requires_password_change === true;
  if (requiresChange && !passwordChanged) {
    return <ForcePasswordChange onComplete={() => setPasswordChanged(true)} />;
  }

  return <Outlet />;
}
