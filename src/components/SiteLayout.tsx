import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/impact", label: "Impact" },
  { to: "/get-involved", label: "Get Involved" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const user = useUser();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background shadow-[0_2px_16px_rgba(16,24,40,.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-[5%] lg:px-[10%] py-4">
          <Link to="/" className="text-2xl font-extrabold">♡ Food<span className="text-primary">Hope</span></Link>
          <nav className="flex flex-wrap gap-6 text-sm font-bold">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="hover:text-primary" activeProps={{ className: "text-primary border-b-[3px] border-primary pb-1" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-3">
            {user ? (
              <>
                <Link to="/dashboard" className="btn">Dashboard</Link>
                <button className="btn btn-red" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn">Sign In</Link>
                <Link to="/signup" className="btn btn-red">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-foreground text-background px-[5%] lg:px-[10%] py-8 text-sm flex flex-wrap justify-between gap-4">
        <span className="font-extrabold text-lg">♡ Food<span className="text-primary">Hope</span></span>
        <span className="opacity-80">Connecting surplus food with those who need it most.</span>
        <span className="opacity-80">© {new Date().getFullYear()} FoodHope</span>
      </footer>
    </div>
  );
}

export function PageHero({ title, sub }: { title: ReactNode; sub: string }) {
  return (
    <div className="bg-secondary px-[5%] lg:px-[10%] py-14 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-3">{title}</h1>
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{sub}</p>
    </div>
  );
}
