import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface InvitationInfo {
  id: string;
  shop_id: string;
  staff_id: string;
  invite_code: string;
  status: string;
  shops?: { name: string } | null;
  staff?: { first_name: string; last_name: string; role: string } | null;
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState("");

  // Store invite code in localStorage so it survives auth redirects
  useEffect(() => {
    if (code) {
      localStorage.setItem("pending_invite_code", code);
    }
  }, [code]);

  // Fetch invitation details for display
  useEffect(() => {
    if (!code) return;
    const fetchInvitation = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("invitations")
        .select("id, shop_id, staff_id, invite_code, status")
        .eq("invite_code", code)
        .eq("status", "pending")
        .maybeSingle();

      if (fetchError || !data) {
        setError("This invitation link is invalid or has expired.");
        localStorage.removeItem("pending_invite_code");
        setLoading(false);
        return;
      }

      const [{ data: shop }, { data: staff }] = await Promise.all([
        supabase.from("shops").select("name").eq("id", data.shop_id).single(),
        supabase.from("staff").select("first_name, last_name, role").eq("id", data.staff_id).single(),
      ]);

      setInvitation({ ...data, shops: shop, staff } as InvitationInfo);
      setLoading(false);
    };
    fetchInvitation();
  }, [code]);

  // If already authenticated, redirect to dashboard — ProtectedRoute will handle acceptance
  useEffect(() => {
    if (!authLoading && session && invitation) {
      navigate("/", { replace: true });
    }
  }, [authLoading, session, invitation, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-destructive">{error}</p>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Join the Team</h1>
          {invitation && (
            <div className="mt-3 space-y-1">
              <p className="text-sm text-muted-foreground">You've been invited to join</p>
              <p className="text-lg font-semibold">{invitation.shops?.name || "a salon"}</p>
              {invitation.staff && (
                <p className="text-sm text-muted-foreground">
                  as{" "}
                  <span className="font-medium text-foreground">
                    {invitation.staff.first_name} {invitation.staff.last_name}
                  </span>{" "}
                  ({invitation.staff.role})
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-apple-lg p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Create an account or sign in to join this salon.
          </p>
          <Button
            className="w-full rounded-xl"
            onClick={() => navigate(`/auth?invite=${code}`)}
          >
            Continue to Sign Up / Sign In
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
