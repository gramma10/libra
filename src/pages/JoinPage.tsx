import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Loader2, Mail, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Store invite code in localStorage so it survives auth redirects
  useEffect(() => {
    if (code) {
      localStorage.setItem("pending_invite_code", code);
    }
  }, [code]);

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

      const { data: shop } = await supabase
        .from("shops")
        .select("name")
        .eq("id", data.shop_id)
        .single();

      const { data: staff } = await supabase
        .from("staff")
        .select("first_name, last_name, role")
        .eq("id", data.staff_id)
        .single();

      setInvitation({
        ...data,
        shops: shop,
        staff: staff,
      } as InvitationInfo);
      setLoading(false);
    };
    fetchInvitation();
  }, [code]);

  // If already logged in, try to accept immediately
  useEffect(() => {
    if (session && invitation && !accepted) {
      acceptInvitation();
    }
  }, [session, invitation]);

  const acceptInvitation = async () => {
    setSubmitting(true);
    const { error } = await supabase.rpc("accept_invitation", {
      _invite_code: code!,
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    setAccepted(true);
    toast.success("Welcome to the team!");
    setTimeout(() => navigate("/", { replace: true }), 1500);
    setSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/join/${code}` },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    toast.success("Account created! Check your email to confirm, then return here.");
    setSubmitting(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    // The useEffect will trigger acceptInvitation after session is set
  };

  if (loading) {
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

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-xl font-semibold">You're in!</h2>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </motion.div>
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
              <p className="text-sm text-muted-foreground">
                You've been invited to join
              </p>
              <p className="text-lg font-semibold">{invitation.shops?.name || "a salon"}</p>
              {invitation.staff && (
                <p className="text-sm text-muted-foreground">
                  as <span className="font-medium text-foreground">{invitation.staff.first_name} {invitation.staff.last_name}</span> ({invitation.staff.role})
                </p>
              )}
            </div>
          )}
        </div>

        {session ? (
          <div className="rounded-2xl border border-border bg-card shadow-apple-lg p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Accepting invitation...</p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <form
            onSubmit={handleSignUp}
            className="rounded-2xl border border-border bg-card shadow-apple-lg p-6 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 rounded-xl"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign Up & Join
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="text-foreground font-medium hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
