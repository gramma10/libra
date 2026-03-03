import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/hooks/useShop";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute() {
  const { session, loading: authLoading } = useAuth();
  const { hasShop, loading: shopLoading } = useShop();

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

  return <Outlet />;
}
