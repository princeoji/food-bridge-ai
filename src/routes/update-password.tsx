import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { supabase } from "@/integrations/supabase/client";
import { authCallbackParameters, authErrorMessage } from "@/lib/auth-forms";

export const Route = createFileRoute("/update-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Choose a New Password — FoodBridge" }] }),
  component: UpdatePassword,
});

function UpdatePassword() {
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    let active = true;
    const parameters = authCallbackParameters();
    async function checkSession() {
      try {
        if (parameters.error) throw new Error("Expired recovery link");
        const initialization = await supabase.auth.initialize();
        if (initialization.error) throw initialization.error;
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw error || new Error("No recovery session");
        if (active) setValidSession(true);
      } catch (error) {
        if (active)
          setErr(
            authErrorMessage(
              error,
              "This reset link is invalid, expired, or already used. Request a new link and open the most recent email.",
            ),
          );
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkSession();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) {
        setValidSession(false);
        setErr("Your session has ended. Request a new password reset link.");
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !validSession) return;
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") || "");
    setErr("");
    if (password.length < 8) {
      setErr("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== String(f.get("confirmPassword") || "")) {
      setErr("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (!data.user) throw new Error("Password update was not confirmed");
      setDone(true);
    } catch (error) {
      setErr(
        authErrorMessage(
          error,
          "We could not change your password. Try again, or request a new reset link.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthCard
      title={done ? "Password updated" : "Choose a new password"}
      description={
        done
          ? "Your new password is ready to use."
          : "Use a strong password you do not use elsewhere."
      }
    >
      {checking ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Checking your reset link…
        </p>
      ) : done ? (
        <div className="grid gap-4">
          <p role="status" className="text-sm">
            Your password has been changed successfully.
          </p>
          <Link to="/dashboard" className="btn btn-red">
            Continue to Dashboard
          </Link>
        </div>
      ) : validSession ? (
        <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
          <label className="grid gap-1.5 text-sm font-bold" htmlFor="new-password">
            New password
            <input
              id="new-password"
              className="field font-normal"
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={busy}
            />
          </label>
          <p className="text-xs text-muted-foreground -mt-2">Use at least 8 characters.</p>
          <label className="grid gap-1.5 text-sm font-bold" htmlFor="confirm-password">
            Confirm new password
            <input
              id="confirm-password"
              className="field font-normal"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={busy}
            />
          </label>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
          <button type="submit" className="btn btn-red" disabled={busy}>
            {busy ? "Updating password…" : "Update Password"}
          </button>
        </form>
      ) : (
        <div className="grid gap-4">
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
          <Link to="/forgot-password" className="btn btn-red">
            Request a New Link
          </Link>
          <Link to="/login" className="btn">
            Back to Sign In
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
