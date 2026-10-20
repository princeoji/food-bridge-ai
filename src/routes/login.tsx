import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { authErrorMessage } from "@/lib/auth-forms";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — FoodBridge" },
      { name: "description", content: "Sign in to your FoodBridge dashboard." },
      { property: "og:title", content: "Sign In — FoodBridge" },
      { property: "og:description", content: "Sign in to your FoodBridge dashboard." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("Hotel");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "").trim();
    setBusy(true);
    setErr("");
    setNotice("");
    setConfirmationEmail("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: String(f.get("password")),
      });
      if (error) throw error;
      if (!data.session) throw new Error("No sign-in session returned");
      await navigate({ to: "/dashboard" });
    } catch (error) {
      setErr(authErrorMessage(error, "We could not sign you in. Please try again."));
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "email_not_confirmed"
      )
        setConfirmationEmail(email);
    } finally {
      setBusy(false);
    }
  }
  async function resendConfirmation() {
    if (busy || !confirmationEmail) return;
    setBusy(true);
    setErr("");
    setNotice("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: confirmationEmail,
        options: { emailRedirectTo: new URL("/auth", window.location.origin).href },
      });
      if (error) throw error;
      setNotice(
        "If this account needs confirmation, check your inbox and spam folder for a new link.",
      );
    } catch (error) {
      setErr(
        authErrorMessage(error, "We could not request a confirmation email. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthCard
      title={role === "Volunteer" ? "Volunteer sign in" : "Welcome back"}
      description="Sign in to donate, rescue, or deliver food. Your account opens its own dashboard."
    >
      <div className="grid grid-cols-3 gap-2 mb-4" role="group" aria-label="Account section">
        {["Hotel", "NGO", "Volunteer"].map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={role === item}
            onClick={() => setRole(item)}
            className={"btn " + (role === item ? "btn-red" : "")}
          >
            {item}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="login-email">
          Email
          <input
            id="login-email"
            className="field font-normal"
            type="email"
            autoComplete="email"
            placeholder="you@organisation.org"
            name="email"
            maxLength={254}
            required
            disabled={busy}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="login-password">
          Password
          <input
            id="login-password"
            className="field font-normal"
            type="password"
            autoComplete="current-password"
            name="password"
            required
            disabled={busy}
          />
        </label>
        <Link to="/forgot-password" className="text-sm text-primary font-bold justify-self-end">
          Forgot your password?
        </Link>
        {err && (
          <p role="alert" className="text-destructive text-sm">
            {err}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-muted-foreground">
            {notice}
          </p>
        )}
        {confirmationEmail && (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void resendConfirmation()}
          >
            Resend Confirmation Email
          </button>
        )}
        <button type="submit" className="btn btn-red" disabled={busy}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="text-primary font-bold">
            Create account
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
