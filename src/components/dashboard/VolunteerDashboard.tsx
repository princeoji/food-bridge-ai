import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { DeliveryDetails } from "@/components/dashboard/DeliveryDetails";
import { deadlineLabel } from "@/lib/dashboard";
import { errorMessage, type Profile } from "@/lib/donations";

export function VolunteerDashboard({ profile }: { profile: Profile }) {
  const client = useQueryClient();
  const [section, setSection] = useState<"available" | "mine">("available");
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const updates = new BroadcastChannel("foodbridge-donations");
    updates.onmessage = () => {
      void client.invalidateQueries({ queryKey: ["donations"] });
    };
    return () => updates.close();
  }, [client]);
  const available = useQuery({
    queryKey: ["donations", "volunteer-available", profile.id, page],
    enabled: section === "available",
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_deliveries", { p_offset: page * 12 });
      if (error) throw error;
      return data;
    },
  });
  const mine = useQuery({
    queryKey: ["donations", "volunteer-mine", profile.id, page, status],
    enabled: section === "mine",
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let query = supabase
        .from("donations")
        .select("*", { count: "exact" })
        .eq("volunteer_id", profile.id);
      query =
        status === "delivered"
          ? query.eq("status", "delivered")
          : query.in("status", ["claimed", "picked_up"]);
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 12, page * 12 + 11);
      if (error) throw error;
      const ids = [
        ...new Set(data.flatMap((d) => [d.donor_id, ...(d.claimed_by ? [d.claimed_by] : [])])),
      ];
      const partners = ids.length
        ? await supabase.from("profiles").select("*").in("id", ids)
        : { data: [], error: null };
      if (partners.error) throw partners.error;
      return {
        rows: data,
        total: count ?? 0,
        partners: Object.fromEntries((partners.data ?? []).map((p) => [p.id, p])),
      };
    },
  });
  async function accept(id: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(id);
    setNotice("");
    try {
      const { data, error } = await supabase.rpc("accept_delivery", { p_donation_id: id });
      if (error) throw error;
      if (!data?.id) throw new Error("This order could not be accepted. Refresh and try again.");
      setSection("mine");
      setPage(0);
      setStatus("active");
      if (typeof BroadcastChannel !== "undefined") {
        const updates = new BroadcastChannel("foodbridge-donations");
        updates.postMessage("changed");
        updates.close();
      }
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      await client.invalidateQueries({ queryKey: ["donations"] });
      pending.current = false;
      setBusy(null);
    }
  }
  const query = section === "available" ? available : mine;
  const canNext =
    section === "available"
      ? available.data?.length === 12
      : (mine.data?.total ?? 0) > (page + 1) * 12;
  return (
    <SiteLayout>
      <section className="bg-secondary px-[5%] lg:px-[7%] py-5 border-b border-border">
        <p className="text-primary text-sm font-bold uppercase tracking-widest">
          Volunteer dashboard
        </p>
        <div className="flex flex-wrap justify-between gap-3 items-center mt-2">
          <h1 className="text-3xl font-extrabold">Welcome, {profile.organisation_name}</h1>
          <Link to="/profile" className="btn">
            My profile
          </Link>
        </div>
        <p className="text-muted-foreground mt-2">
          Accept an order → Show the code to the hotel → Collect food → Deliver to the NGO.
        </p>
        <nav className="flex gap-3 mt-4" aria-label="Volunteer sections">
          {(["available", "mine"] as const).map((item) => (
            <button
              key={item}
              className={"btn " + (section === item ? "btn-red" : "")}
              aria-pressed={section === item}
              onClick={() => {
                setSection(item);
                setPage(0);
              }}
            >
              {item === "available" ? "Available deliveries" : "My deliveries"}
            </button>
          ))}
        </nav>
      </section>
      <section className="px-[5%] lg:px-[7%] py-6 space-y-4">
        <div className="flex justify-between flex-wrap gap-3 items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Truck size={22} className="text-primary" />
            {section === "available" ? "Orders waiting for a volunteer" : "Your deliveries"}
          </h2>
          <div className="flex gap-2">
            {section === "mine" && (
              <select
                className="field w-auto"
                aria-label="Delivery status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <option value="active">Active</option>
                <option value="delivered">Delivered</option>
              </select>
            )}
            <button
              className="btn"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Refresh
            </button>
          </div>
        </div>
        {notice && (
          <p role="alert" className="card-box p-3 text-destructive">
            {notice}
          </p>
        )}
        {query.isPending ? (
          <p role="status">Loading deliveries…</p>
        ) : query.isError ? (
          <p role="alert" className="text-destructive">
            {errorMessage(query.error)}
          </p>
        ) : (
          <>
            {section === "available" ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {!available.data?.length && (
                  <p className="text-muted-foreground">
                    No orders are waiting right now. New NGO claims appear here automatically.
                  </p>
                )}
                {available.data?.map((d) => (
                  <article key={d.id} className="card-box p-4 space-y-3">
                    <h3 className="font-bold text-lg">
                      {d.food_name} · {d.quantity} meals
                    </h3>
                    <p className="text-sm flex gap-2">
                      <MapPin size={16} className="text-primary shrink-0" />
                      <span>
                        <strong>Pickup:</strong> {d.pickup_address}
                      </span>
                    </p>
                    <p className="text-sm">
                      <strong>Deliver to NGO:</strong> {d.delivery_address}
                    </p>
                    <p className="text-xs text-primary font-bold">{deadlineLabel(d.best_before)}</p>
                    <p className="text-xs text-muted-foreground">
                      Accept only if you can collect safely before the deadline. The pickup code and
                      partner contacts appear after you accept.
                    </p>
                    <button
                      className="btn btn-red"
                      disabled={!!busy}
                      onClick={() => void accept(d.id)}
                    >
                      {busy === d.id ? "Accepting…" : "Accept delivery"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {!mine.data?.rows.length && (
                  <p className="text-muted-foreground">
                    No {status} deliveries. Accept an available order to get started.
                  </p>
                )}
                {mine.data?.rows.map((d) => (
                  <article key={d.id} className="card-box p-4 space-y-3">
                    <h3 className="font-bold text-lg">
                      {d.food_name} · {d.quantity} meals
                    </h3>
                    <p className="text-sm">
                      <strong>Collect from:</strong> {d.pickup_address}
                    </p>
                    {[d.donor_id, d.claimed_by].map((id) => {
                      const partner = id ? mine.data?.partners[id] : null;
                      return partner ? (
                        <p key={id} className="text-sm">
                          {partner.organisation_name}:{" "}
                          <a
                            className="text-primary underline"
                            href={"tel:" + partner.phone.replace(/[^+\d]/g, "")}
                          >
                            {partner.phone}
                          </a>
                        </p>
                      ) : null;
                    })}
                    <DeliveryDetails donation={d} role="Volunteer" />
                  </article>
                ))}
              </div>
            )}
            <div className="flex gap-3 items-center">
              <button className="btn" disabled={!page} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="text-sm">Page {page + 1}</span>
              <button className="btn" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Updates every 10 seconds and when you return to this window.
        </p>
      </section>
    </SiteLayout>
  );
}
