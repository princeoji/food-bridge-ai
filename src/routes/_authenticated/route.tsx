import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error?.name === "AuthRetryableFetchError") throw error;
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  pendingComponent: () => (
    <AuthCard title="Opening your account">
      <p role="status" className="text-sm text-center text-muted-foreground">
        Checking your session…
      </p>
    </AuthCard>
  ),
  errorComponent: AuthenticatedError,
  component: AuthSessionBoundary,
});

function AuthenticatedError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <AuthCard title="We could not open your account">
      <div className="grid gap-4">
        <p role="alert" className="text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
        <button
          type="button"
          className="btn btn-red"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
        >
          Try Again
        </button>
        <Link to="/login" className="btn">
          Go to Sign In
        </Link>
      </div>
    </AuthCard>
  );
}

function AuthSessionBoundary() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const observedUserId = useRef<string | null>(user.id);
  const retry = useRef<() => void>(() => {});
  const [sessionUserId, setSessionUserId] = useState<string | null>(user.id);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let revision = 0;
    let completedRevision = 0;
    let reconciling = false;
    let scheduled: ReturnType<typeof setTimeout> | undefined;

    function clearPrivateQueries() {
      for (const queryKey of [["profile"], ["donations"]]) {
        // Cancellation prevents an old account's in-flight response from
        // repopulating its cache after the session has changed.
        void queryClient.cancelQueries({ queryKey }, { silent: true });
        queryClient.removeQueries({ queryKey });
      }
    }

    async function reconcile() {
      if (!active || reconciling) return;
      reconciling = true;
      try {
        // Serialize changes so a slower verification for an earlier account
        // cannot be the final route context after a newer auth event.
        while (active && completedRevision !== revision) {
          const attemptedRevision = revision;
          try {
            if (observedUserId.current) await router.invalidate();
            else await navigate({ to: "/login", replace: true });
          } catch {
            if (active && revision === attemptedRevision) setSyncFailed(true);
          }
          completedRevision = attemptedRevision;
        }
      } finally {
        reconciling = false;
      }
    }

    function scheduleReconciliation() {
      if (scheduled !== undefined) clearTimeout(scheduled);
      // Leave Supabase's auth callback before route loaders call the SDK.
      scheduled = setTimeout(() => {
        scheduled = undefined;
        void reconcile();
      }, 0);
    }

    retry.current = () => {
      if (!active) return;
      revision += 1;
      setSyncFailed(false);
      clearPrivateQueries();
      scheduleReconciliation();
    };

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUserId = session?.user.id ?? null;
      if (nextUserId === observedUserId.current) return;
      observedUserId.current = nextUserId;
      setSessionUserId(nextUserId);
      setSyncFailed(false);
      revision += 1;
      clearPrivateQueries();
      scheduleReconciliation();
    });
    return () => {
      active = false;
      if (scheduled !== undefined) clearTimeout(scheduled);
      data.subscription.unsubscribe();
      // Leaving protected pages also removes private data, including when the
      // account is subsequently switched or signed out on a public page.
      clearPrivateQueries();
    };
  }, [navigate, queryClient, router]);

  if (sessionUserId !== user.id) {
    return (
      <AuthCard title={syncFailed ? "We could not refresh your account" : "Updating your session"}>
        {syncFailed ? (
          <div className="grid gap-4">
            <p role="alert" className="text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
            <button type="button" className="btn btn-red" onClick={() => retry.current()}>
              Try Again
            </button>
            <Link to="/login" className="btn">
              Go to Sign In
            </Link>
          </div>
        ) : (
          <p role="status" className="text-sm text-center text-muted-foreground">
            Checking your current account…
          </p>
        )}
      </AuthCard>
    );
  }

  return <Outlet key={user.id} />;
}
