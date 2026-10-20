import { useQuery } from "@tanstack/react-query";
import { HandHeart, Heart, RefreshCw, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = { meals: number; hotels: number; ngos: number; donations: number };

async function loadStats(): Promise<Stats> {
  const { data, error } = await supabase.rpc("impact_stats");
  if (error) throw error;
  const stats = data as unknown as Stats | null;
  if (
    !stats ||
    ![stats.meals, stats.hotels, stats.ngos, stats.donations].every(
      (value) => typeof value === "number" && Number.isFinite(value) && value >= 0,
    )
  ) {
    throw new Error("Impact figures are unavailable.");
  }
  return stats;
}

export function ImpactStats() {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["public-impact-stats"],
    queryFn: loadStats,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const items = [
    { icon: Heart, value: data?.meals, label: "Meals Delivered" },
    { icon: Store, value: data?.hotels, label: "Food Partners" },
    { icon: Users, value: data?.ngos, label: "NGOs Joined" },
    { icon: HandHeart, value: data?.donations, label: "Donations Listed" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" aria-busy={isPending}>
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="card-box p-4 sm:p-4 text-center">
            <Icon
              className="mx-auto size-8 text-primary mb-3"
              aria-hidden="true"
              strokeWidth={1.8}
            />
            <strong className="block text-2xl sm:text-3xl mb-2 tabular-nums">
              {value === undefined ? "—" : value.toLocaleString("en-IN")}
            </strong>
            <p className="text-sm sm:text-base text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {isPending && (
        <p className="mt-4 text-center text-sm text-muted-foreground" role="status">
          Loading community impact…
        </p>
      )}
      {error ? (
        <div
          className="mt-4 flex flex-wrap justify-center items-center gap-3 text-center text-sm"
          role="status"
        >
          <p className="text-muted-foreground">
            {data
              ? "We couldn't refresh these figures. Showing the last available counts."
              : "Impact figures couldn't be loaded."}
          </p>
          <button
            type="button"
            className="btn gap-2 text-sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`size-4 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      ) : (
        !isPending && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Meals count confirmed deliveries. Figures refresh every 30 seconds.
          </p>
        )
      )}
    </div>
  );
}
