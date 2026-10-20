import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { supabase } from "@/integrations/supabase/client";
import { authCallbackParameters, authErrorMessage } from "@/lib/auth-forms";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Confirm Account — FoodBridge" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  useEffect(() => {
    let active = true;
    const parameters = authCallbackParameters();
    async function finish() {
      try {
        if (parameters.error) {
          if (active)
            setErr(
              "This confirmation link is invalid, expired, or has already been used. Try signing in to request a new confirmation email if needed.",
            );
          return;
        }
        // The existing Supabase client automatically consumes implicit callback
        // tokens and exchanges PKCE codes when a matching verifier is stored.
        const initialization = await supabase.auth.initialize();
        if (initialization.error) throw initialization.error;
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          if (active)
            setErr(
              "We could not verify this link. It may have expired or been opened in a different browser. Try signing in or request a new confirmation link.",
            );
          return;
        }
        const result = await supabase.auth.getUser();
        if (result.error || !result.data.user) throw result.error || new Error("No user");
        if (active)
          await navigate({
            to: parameters.recovery ? "/update-password" : "/dashboard",
            replace: true,
          });
      } catch (error) {
        if (active)
          setErr(
            authErrorMessage(
              error,
              "We could not confirm your account. Try signing in, or request a new confirmation link.",
            ),
          );
      }
    }
    void finish();
    return () => {
      active = false;
    };
  }, [navigate]);
  return (
    <AuthCard title={err ? "We could not confirm this link" : "Confirming your account"}>
      {err ? (
        <div className="grid gap-4">
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
          <Link to="/login" className="btn btn-red">
            Go to Sign In
          </Link>
          <Link to="/signup" className="btn">
            Create an account
          </Link>
        </div>
      ) : (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Please wait while we check your session…
        </p>
      )}
    </AuthCard>
  );
}
