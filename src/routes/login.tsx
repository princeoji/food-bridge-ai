import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — FoodHope" },
      { name: "description", content: "Sign in to your FoodHope dashboard." },
      { property: "og:title", content: "Sign In — FoodHope" },
      { property: "og:description", content: "Sign in to your FoodHope dashboard." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) setErr(error.message); else navigate({ to: "/dashboard" });
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <form onSubmit={submit} className="card-box w-full max-w-[400px] grid gap-3.5 p-7">
        <Link to="/" className="text-center text-xl font-extrabold">♡ Food<span className="text-primary">Hope</span></Link>
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        <input className="field" type="email" placeholder="Email" name="email" required />
        <input className="field" type="password" placeholder="Password" name="password" required />
        {err && <p className="text-destructive text-sm">{err}</p>}
        <button className="btn btn-red" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>
        <p className="text-center text-sm text-muted-foreground">New here? <Link to="/signup" className="text-primary font-bold">Create account</Link></p>
      </form>
    </div>
  );
}
