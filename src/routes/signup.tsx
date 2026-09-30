import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — FoodHope" },
      { name: "description", content: "Register your hotel or NGO on FoodHope." },
      { property: "og:title", content: "Create Account — FoodHope" },
      { property: "og:description", content: "Register your hotel or NGO on FoodHope." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: {
          organisation_name: f.get("organisationName"),
          organisation_type: f.get("organisationType"),
          phone: f.get("number"),
          capacity: f.get("capacity"),
        },
      },
    });
    setBusy(false);
    if (error) setErr(error.message); else setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      {done ? (
        <div className="card-box p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-muted-foreground mb-4">We sent a confirmation link. Click it to activate your account.</p>
          <Link to="/login" className="btn btn-red">Go to Sign In</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card-box w-full max-w-[440px] grid gap-3.5 p-7">
          <Link to="/" className="text-center text-xl font-extrabold">♡ Food<span className="text-primary">Hope</span></Link>
          <h1 className="text-2xl font-bold text-center">Create Account</h1>
          <input className="field" placeholder="Organisation name" name="organisationName" required />
          <select className="field" name="organisationType" required defaultValue="">
            <option value="">Choose Hotel or NGO</option>
            <option value="Hotel">Hotel</option>
            <option value="NGO">NGO</option>
          </select>
          <input className="field" type="tel" placeholder="Phone number" name="number" required />
          <input className="field" type="email" placeholder="Email" name="email" required />
          <input className="field" type="number" min={0} placeholder="Capacity (meals per day)" name="capacity" required />
          <input className="field" type="password" minLength={6} placeholder="Password" name="password" required />
          {err && <p className="text-destructive text-sm">{err}</p>}
          <button className="btn btn-red" disabled={busy}>{busy ? "Creating…" : "Create"}</button>
          <p className="text-center text-sm text-muted-foreground">Already registered? <Link to="/login" className="text-primary font-bold">Sign In</Link></p>
        </form>
      )}
    </div>
  );
}
