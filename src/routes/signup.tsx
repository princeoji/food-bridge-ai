import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { authErrorMessage, isOrganisationType, validateOrganisation } from "@/lib/auth-forms";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — FoodBridge" },
      { name: "description", content: "Register your hotel or NGO on FoodBridge." },
      { property: "og:title", content: "Create Account — FoodBridge" },
      { property: "og:description", content: "Register your hotel or NGO on FoodBridge." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const [err, setErr] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const organisationName = String(f.get("organisationName") || "").trim();
    const organisationType = String(f.get("organisationType") || "");
    const phone = String(f.get("phone") || "").trim();
    const capacity = Number(f.get("capacity"));
    const email = String(f.get("email") || "").trim();
    const password = String(f.get("password") || "");
    const validationError = validateOrganisation(organisationName, phone, capacity);
    setErr("");
    if (validationError) {
      setErr(validationError);
      return;
    }
    if (!isOrganisationType(organisationType)) {
      setErr("Choose Hotel, NGO, or Volunteer.");
      return;
    }
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: new URL("/auth", window.location.origin).href,
          data: {
            organisation_name: organisationName,
            organisation_type: organisationType,
            phone,
            capacity,
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        await navigate({ to: "/dashboard" });
      } else if (data.user) {
        setConfirmationEmail(email);
      } else {
        setErr("We could not create your account. Please try again.");
      }
    } catch (error) {
      setErr(authErrorMessage(error, "We could not create your account. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (confirmationEmail)
    return (
      <AuthCard
        title="Check your email"
        description="Confirm your email to finish joining FoodBridge."
      >
        <div className="grid gap-4 text-sm">
          <p role="status">
            If <strong className="break-all">{confirmationEmail}</strong> is eligible for a new
            account, check its inbox and spam folder for a confirmation link. Open the link to
            activate your account.
          </p>
          <p className="text-muted-foreground">
            Already have an account? You can sign in using your existing password. Email delivery
            may take a few minutes.
          </p>
          <Link to="/login" className="btn btn-red">
            Go to Sign In
          </Link>
          <button type="button" className="btn" onClick={() => setConfirmationEmail("")}>
            Use a different email
          </button>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard
      title="Create your account"
      description="Join as a hotel, NGO, or volunteer delivering food."
    >
      <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="signup-name">
          Organisation name / your full name
          <input
            id="signup-name"
            className="field font-normal"
            autoComplete="organization"
            name="organisationName"
            minLength={2}
            maxLength={120}
            required
            disabled={busy}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="signup-type">
          Organisation type
          <select
            id="signup-type"
            className="field font-normal"
            name="organisationType"
            required
            defaultValue=""
            onChange={(event) => setRole(event.target.value)}
            disabled={busy}
          >
            <option value="" disabled>
              Choose Hotel, NGO, or Volunteer
            </option>
            <option value="Hotel">Hotel / Restaurant</option>
            <option value="NGO">NGO</option>
            <option value="Volunteer">Volunteer</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="signup-phone">
          Contact phone
          <input
            id="signup-phone"
            className="field font-normal"
            type="tel"
            autoComplete="tel"
            name="phone"
            maxLength={40}
            placeholder="Include area or country code"
            required
            disabled={busy}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="signup-email">
          Email
          <input
            id="signup-email"
            className="field font-normal"
            type="email"
            autoComplete="email"
            name="email"
            maxLength={254}
            required
            disabled={busy}
          />
        </label>
        {role === "Volunteer" ? (
          <input type="hidden" name="capacity" value="0" />
        ) : (
          <>
            <label className="grid gap-1.5 text-sm font-bold" htmlFor="signup-capacity">
              Serving capacity (meals per donation)
              <input
                id="signup-capacity"
                className="field font-normal"
                type="number"
                min={0}
                max={1_000_000}
                step={1}
                name="capacity"
                required
                disabled={busy}
                aria-describedby="capacity-help"
              />
            </label>
            <p id="capacity-help" className="text-xs text-muted-foreground -mt-2">
              An estimate of how many meals you can donate or distribute in one donation.
            </p>
          </>
        )}
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="signup-password">
          Password
          <input
            id="signup-password"
            className="field font-normal"
            type="password"
            autoComplete="new-password"
            minLength={8}
            name="password"
            required
            disabled={busy}
            aria-describedby="password-help"
          />
        </label>
        <p id="password-help" className="text-xs text-muted-foreground -mt-2">
          Use at least 8 characters.
        </p>
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="signup-confirm">
          Confirm password
          <input
            id="signup-confirm"
            className="field font-normal"
            type="password"
            autoComplete="new-password"
            minLength={8}
            name="confirmPassword"
            required
            disabled={busy}
          />
        </label>
        {err && (
          <p role="alert" className="text-destructive text-sm">
            {err}
          </p>
        )}
        <button type="submit" className="btn btn-red" disabled={busy}>
          {busy ? "Creating account…" : "Create Account"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="text-primary font-bold">
            Sign In
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
