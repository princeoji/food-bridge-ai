import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LogIn, LogOut, Menu, UserPlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { FoodBridgeBrand } from "@/components/FoodBridgeBrand";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function useAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let authChanged = false;
    setLoading(true);
    setError("");
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "INITIAL_SESSION") return;
      authChanged = true;
      setUser(session?.user ?? null);
      setLoading(false);
      setError("");
    });
    supabase.auth
      .getUser()
      .then(({ data, error: authError }) => {
        if (!active || authChanged) return;
        setUser(data.user);
        if (authError && authError.name !== "AuthSessionMissingError")
          setError("We couldn't check your account. Please try again.");
        setLoading(false);
      })
      .catch(() => {
        if (!active || authChanged) return;
        setError("We couldn't check your account. Please try again.");
        setLoading(false);
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [attempt]);
  return { user, loading, error, retry: () => setAttempt((value) => value + 1) };
}

export function useUser() {
  return useAccount().user;
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
  const { user, loading, error: accountError, retry } = useAccount();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => {
      if (media.matches) setMenuOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMenuOpen(false);
      await navigate({ to: "/" });
    } catch {
      setSignOutError("We couldn't sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  function accountControls() {
    if (loading)
      return (
        <span className="self-center text-sm text-muted-foreground" role="status">
          Checking account…
        </span>
      );
    return user ? (
      <>
        <Link to="/dashboard" className="btn px-4" onClick={() => setMenuOpen(false)}>
          Dashboard
        </Link>
        <button
          type="button"
          className="btn btn-red gap-2 px-4"
          disabled={signingOut}
          onClick={signOut}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </>
    ) : (
      <>
        <Link to="/login" className="btn gap-2 px-4" onClick={() => setMenuOpen(false)}>
          <LogIn className="size-4" aria-hidden="true" />
          Sign In
        </Link>
        <Link to="/signup" className="btn btn-red gap-2 px-4" onClick={() => setMenuOpen(false)}>
          <UserPlus className="size-4" aria-hidden="true" />
          Sign Up
        </Link>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="sticky top-0 z-20 bg-background shadow-[0_2px_16px_rgba(16,24,40,.08)]">
        <div className="flex items-center justify-between gap-3 px-[5%] lg:px-[7%] py-2.5">
          <Link to="/" aria-label="FoodBridge home" className="shrink-0 text-2xl">
            <FoodBridgeBrand />
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden xl:flex items-center gap-3 text-sm font-bold"
          >
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                className="py-2 hover:text-primary whitespace-nowrap"
                activeProps={{
                  className: "text-primary border-b-[3px] border-primary",
                  "aria-current": "page",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden xl:flex gap-3">{accountControls()}</div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="btn gap-2 px-3 xl:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" aria-hidden="true" />
                Menu
              </button>
            </SheetTrigger>
            <SheetContent className="w-[min(90vw,360px)] overflow-y-auto p-4">
              <SheetTitle className="pr-7">
                <FoodBridgeBrand className="text-xl" />
                <span className="sr-only"> navigation</span>
              </SheetTitle>
              <SheetDescription className="mt-3">
                Share good food. Find your next step.
              </SheetDescription>
              <nav aria-label="Mobile navigation" className="mt-4 flex flex-col gap-1">
                {nav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    activeOptions={{ exact: true }}
                    className="rounded-md px-3 py-3 font-bold hover:bg-secondary"
                    activeProps={{ className: "bg-accent text-primary", "aria-current": "page" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-6">
                {accountControls()}
              </div>
              {signOutError && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {signOutError}
                </p>
              )}
            </SheetContent>
          </Sheet>
        </div>
        {(accountError || signOutError) && (
          <div className="border-t border-border px-[5%] lg:px-[7%] py-3 text-sm" role="alert">
            {accountError || signOutError}
            {accountError && (
              <button
                type="button"
                onClick={retry}
                className="ml-3 font-bold text-primary underline underline-offset-4"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <footer className="bg-foreground text-background px-[5%] lg:px-[7%] py-5 text-sm flex flex-wrap items-center justify-between gap-3">
        <Link to="/" aria-label="FoodBridge home">
          <FoodBridgeBrand className="text-lg" />
        </Link>
        <span className="opacity-80">Connecting surplus food with those who need it most.</span>
        <span className="opacity-80">© {new Date().getFullYear()} FoodBridge</span>
      </footer>
    </div>
  );
}

export function PageHero({ title, sub }: { title: ReactNode; sub: string }) {
  return (
    <div className="bg-secondary px-[5%] lg:px-[7%] py-8 md:py-9 text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3">{title}</h1>
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{sub}</p>
    </div>
  );
}
