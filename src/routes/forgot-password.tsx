import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-forms";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — FoodBridge" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/update-password", window.location.origin).href,
      });
      if (error) throw error;
      setDone(true);
    } catch (error) {
      setErr(authErrorMessage(error, "We could not request a reset link. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthCard
      title={done ? "Check your email" : "Forgot your password?"}
      description={
        done
          ? "Follow the reset link to choose a new password."
          : "Enter your account email and we will help you reset it."
      }
    >
      {done ? (
        <div className="grid gap-4 text-sm">
          <p role="status">
            If an account exists with this email, you will receive a password reset link. Check your
            inbox and spam folder.
          </p>
          <button type="button" className="btn" onClick={() => setDone(false)}>
            Try another email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
          <label className="grid gap-1.5 text-sm font-bold" htmlFor="reset-email">
            Email
            <input
              id="reset-email"
              className="field font-normal"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
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
            {busy ? "Requesting link…" : "Send Reset Link"}
          </button>
        </form>
      )}
      <p className="text-center mt-5 text-sm">
        <Link to="/login" className="font-bold text-primary">
          Back to Sign In
        </Link>
      </p>
    </AuthCard>
  );
}
