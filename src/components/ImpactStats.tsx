import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Stats = { meals: number; hotels: number; ngos: number; donations: number };

export function ImpactStats() {
  const [s, setS] = useState<Stats>({ meals: 0, hotels: 0, ngos: 0, donations: 0 });
  useEffect(() => {
    supabase.rpc("impact_stats").then(({ data }) => data && setS(data as unknown as Stats));
  }, []);
  const items = [
    { icon: "♡", v: s.meals, l: "Meals Served" },
    { icon: "▣", v: s.hotels, l: "Food Partners" },
    { icon: "♙", v: s.ngos, l: "NGOs Joined" },
    { icon: "♢", v: s.donations, l: "Donations Listed" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map((i) => (
        <div key={i.l} className="card-box p-6 text-center">
          <div className="text-primary text-3xl mb-1">{i.icon}</div>
          <strong className="block text-3xl mb-2">{i.v}</strong>
          <p className="text-muted-foreground">{i.l}</p>
        </div>
      ))}
    </div>
  );
}
