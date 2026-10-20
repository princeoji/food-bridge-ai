import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  LayoutDashboard,
  Plus,
  Store,
  Utensils,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, type Donation, type Profile } from "@/lib/donations";
import { deadlineLabel } from "@/lib/dashboard";

type Props = {
  profile: Profile;
  onListings: (status?: string) => void;
  onClaims: (status?: string) => void;
  onNew: () => void;
  onRepeat: (donation: Donation) => void;
};

export function DashboardOverview({ profile, onListings, onClaims, onNew, onRepeat }: Props) {
  const hotel = profile.organisation_type === "Hotel";
  const summary = useQuery({
    queryKey: ["donations", "overview", profile.id, profile.organisation_type],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const owned = () =>
        supabase
          .from("donations")
          .select("id", { count: "exact", head: true })
          .eq(hotel ? "donor_id" : "claimed_by", profile.id);
      const results = await Promise.all([
        owned(),
        hotel
          ? owned().eq("status", "available").gt("best_before", new Date().toISOString())
          : supabase
              .from("donations")
              .select("id", { count: "exact", head: true })
              .eq("status", "available")
              .gt("best_before", new Date().toISOString()),
        owned().in("status", ["claimed", "picked_up"]),
        owned().eq("status", "delivered"),
      ]);
      for (const result of results) {
        if (result.error) throw result.error;
        if (typeof result.count !== "number")
          throw new Error("Your dashboard totals are unavailable.");
      }
      return {
        total: results[0]!.count!,
        available: results[1]!.count!,
        claimed: results[2]!.count!,
        delivered: results[3]!.count!,
      };
    },
  });
  const recent = useQuery({
    queryKey: ["donations", "recent", profile.id, profile.organisation_type],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq(hotel ? "donor_id" : "claimed_by", profile.id)
        .order("created_at", { ascending: false })
        .order("id")
        .limit(3);
      if (error) throw error;
      return data;
    },
  });
  const cards = hotel
    ? [
        {
          label: "Total donations",
          value: summary.data?.total,
          icon: Utensils,
          detail: "All your current listings",
          click: () => onListings("all"),
        },
        {
          label: "Available now",
          value: summary.data?.available,
          icon: Store,
          detail: "Ready for an NGO to claim",
          click: () => onListings("available"),
        },
        {
          label: "Active deliveries",
          value: summary.data?.claimed,
          icon: Clock3,
          detail: "Awaiting pickup or on the way",
          click: () => onListings("active"),
        },
        {
          label: "Delivered",
          value: summary.data?.delivered,
          icon: CheckCircle2,
          detail: "Completed food donations",
          click: () => onListings("delivered"),
        },
      ]
    : [
        {
          label: "Available donations",
          value: summary.data?.available,
          icon: Utensils,
          detail: "Unexpired food to explore",
          click: () => onListings(),
        },
        {
          label: "Active pickups",
          value: summary.data?.claimed,
          icon: Clock3,
          detail: "Awaiting pickup or on the way",
          click: () => onClaims("active"),
        },
        {
          label: "Delivered",
          value: summary.data?.delivered,
          icon: HeartHandshake,
          detail: "Your completed food rescues",
          click: () => onClaims("delivered"),
        },
        {
          label: "Serving capacity",
          value: profile.capacity,
          icon: Users,
          detail: "Meals per donation",
          click: null,
        },
      ];
  const total = summary.data
    ? hotel
      ? summary.data.total
      : summary.data.claimed + summary.data.delivered
    : 0;
  const completed = summary.data?.delivered ?? 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section id="overview" className="space-y-4 scroll-mt-28" aria-label="Dashboard overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-3" aria-busy={summary.isPending}>
        {cards.map(({ label, value, icon: Icon, detail, click }) => {
          const contents = (
            <>
              <span className="flex justify-between items-start gap-2">
                <span className="font-bold text-sm">{label}</span>
                <Icon size={18} className="text-primary shrink-0" aria-hidden="true" />
              </span>
              <strong className="block text-2xl md:text-3xl font-extrabold tracking-tight mt-2 tabular-nums">
                {value == null ? "—" : value.toLocaleString()}
              </strong>
              <span className="block text-xs text-muted-foreground mt-1">{detail}</span>
            </>
          );
          return click ? (
            <button
              key={label}
              type="button"
              onClick={click}
              className="card-box p-4 md:p-4 text-left hover:border-primary transition-colors"
            >
              {contents}
            </button>
          ) : (
            <Link
              key={label}
              to="/profile"
              className="card-box p-4 md:p-4 hover:border-primary transition-colors"
            >
              {contents}
            </Link>
          );
        })}
      </div>
      {summary.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-destructive">{errorMessage(summary.error)}</span>
          <button
            className="font-bold underline text-primary"
            onClick={() => void summary.refetch()}
          >
            Retry totals
          </button>
        </div>
      )}
      <div className="grid md:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
        <div className="space-y-4">
          <div className="card-box p-4 md:p-4">
            <div className="flex items-center gap-2 mb-4">
              <LayoutDashboard size={19} className="text-primary" />
              <h2 className="text-lg font-bold">Quick actions</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <button
                onClick={hotel ? onNew : () => onListings()}
                className="rounded-xl bg-primary text-primary-foreground p-4 text-left flex flex-col items-start gap-3 hover:opacity-90"
              >
                <Plus size={18} />
                <span className="font-bold">{hotel ? "Donate food" : "Browse available food"}</span>
              </button>
              <button
                onClick={hotel ? () => onListings("active") : () => onClaims("active")}
                className="rounded-xl border border-border bg-secondary p-4 text-left flex flex-col items-start gap-3 hover:border-primary"
              >
                <ArrowDownToLine size={18} className="text-primary" />
                <span className="font-bold">Manage pickups</span>
              </button>
              <Link
                to="/profile"
                className="rounded-xl border border-border p-4 flex flex-col items-start gap-3 hover:border-primary"
              >
                <Users size={18} className="text-primary" />
                <span className="font-bold">Organisation settings</span>
              </Link>
            </div>
          </div>
          <div className="card-box overflow-hidden">
            <div className="flex flex-wrap justify-between items-center gap-3 p-4 md:p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">
                  {hotel ? "Recent donations" : "Your recent claims"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {hotel
                    ? "Your latest food listings at a glance"
                    : "Your claimed food, ordered by listing date"}
                </p>
              </div>
              <button
                className="text-primary text-sm font-bold"
                onClick={hotel ? () => onListings("all") : () => onClaims("all")}
              >
                View all →
              </button>
            </div>
            {recent.isPending ? (
              <p className="p-4 text-muted-foreground" role="status">
                Loading your recent listings…
              </p>
            ) : recent.isError ? (
              <div className="p-4 text-sm" role="alert">
                <p className="text-destructive">{errorMessage(recent.error)}</p>
                <button
                  className="text-primary underline mt-2"
                  onClick={() => void recent.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : !recent.data.length ? (
              <div className="px-6 py-5 text-center">
                <Utensils size={24} className="text-primary mx-auto mb-3" />
                <h3 className="font-bold">
                  {hotel ? "Your first donation starts here" : "Your next food rescue starts here"}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {hotel
                    ? "List a meal and help good food reach a community."
                    : "Browse available food and claim what your organisation can serve."}
                </p>
                <button className="btn mt-4" onClick={hotel ? onNew : () => onListings()}>
                  {hotel ? "Create a donation" : "Explore food"}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.data.map((donation) => (
                  <li
                    key={donation.id}
                    className="px-5 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="size-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Utensils size={18} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold break-words">{donation.food_name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {donation.quantity} meals · Listed{" "}
                          {new Date(donation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="text-xs rounded-full bg-accent text-primary px-3 py-1 font-bold">
                        {donation.status === "delivered"
                          ? "Delivered"
                          : donation.status === "picked_up"
                            ? "On the way"
                            : donation.status === "claimed"
                              ? "Pickup pending"
                              : deadlineLabel(donation.best_before)}
                      </span>
                      {hotel ? (
                        <button
                          className="text-sm font-bold text-primary"
                          onClick={() => onRepeat(donation)}
                        >
                          Use as template
                        </button>
                      ) : (
                        <button
                          className="text-sm font-bold text-primary"
                          onClick={() => onClaims(donation.status)}
                        >
                          Details →
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <aside className="space-y-3">
          <div className="card-box bg-secondary p-4">
            <HeartHandshake className="text-primary mb-2" size={22} />
            <h2 className="text-lg font-bold">Your rescue progress</h2>
            {summary.data ? (
              <>
                <div className="flex justify-between mt-4 mb-2 text-sm font-bold">
                  <span>
                    {completed} of {total} {hotel ? "donations" : "claims"} delivered
                  </span>
                  <span>{progress}%</span>
                </div>
                <progress
                  value={completed}
                  max={total || 1}
                  className="w-full h-2 accent-[var(--primary)]"
                  aria-label="Completed donations"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Hotels verify pickup codes; volunteers confirm delivery to the NGO.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-5">
                {summary.isError ? "Progress is unavailable right now." : "Loading your progress…"}
              </p>
            )}
          </div>
          <details className="card-box p-4">
            <summary className="font-bold cursor-pointer">Pickup checklist</summary>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                "Check the collection address and best-before time.",
                "Call your donation partner to agree on collection.",
                "Keep food safely packed and share allergen details.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="rounded-full size-6 shrink-0 bg-accent text-primary flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <Link to="/contact" className="text-primary font-bold text-sm inline-block mt-5">
              Need help? Contact us →
            </Link>
          </details>
        </aside>
      </div>
    </section>
  );
}
