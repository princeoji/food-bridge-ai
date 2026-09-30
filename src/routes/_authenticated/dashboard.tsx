import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FoodHope" }, { name: "description", content: "Manage your FoodHope donations." }] }),
  component: Dashboard,
});

type Profile = { id: string; organisation_name: string; organisation_type: string; phone: string; capacity: number };
type Donation = { id: string; donor_id: string; food_name: string; quantity: number; pickup_address: string; best_before: string | null; notes: string | null; status: string; claimed_by: string | null; created_at: string };

const badge: Record<string, string> = {
  available: "bg-accent text-primary",
  claimed: "bg-secondary text-foreground border border-border",
  delivered: "bg-foreground text-background",
};

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Donation[]>([]);
  const [orgs, setOrgs] = useState<Record<string, Profile>>({});
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [{ data: p }, { data: d }, { data: all }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("donations").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
    ]);
    setProfile(p as Profile | null);
    setItems((d as Donation[]) ?? []);
    setOrgs(Object.fromEntries(((all as Profile[]) ?? []).map((o) => [o.id, o])));
  }, [user.id]);
  useEffect(() => { load(); }, [load]);

  const isHotel = profile?.organisation_type !== "NGO";

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const bb = String(f.get("best_before") || "");
    const { error } = await supabase.from("donations").insert({
      donor_id: user.id,
      food_name: String(f.get("food_name")),
      quantity: Number(f.get("quantity")),
      pickup_address: String(f.get("pickup_address")),
      best_before: bb ? new Date(bb).toISOString() : null,
      notes: String(f.get("notes") || "") || null,
    });
    if (error) return setMsg(error.message);
    form.reset(); setMsg("Donation listed. Thank you!"); load();
  }
  async function update(id: string, patch: Partial<Donation>) {
    const { error } = await supabase.from("donations").update(patch).eq("id", id);
    if (error) setMsg(error.message); else load();
  }
  async function remove(id: string) {
    await supabase.from("donations").delete().eq("id", id); load();
  }

  const mine = items.filter((d) => d.donor_id === user.id);
  const available = items.filter((d) => d.status === "available");
  const claimed = items.filter((d) => d.claimed_by === user.id);

  return (
    <SiteLayout>
      <div className="bg-secondary px-[5%] lg:px-[10%] py-10">
        <h1 className="text-4xl font-extrabold">Welcome, <span className="text-primary">{profile?.organisation_name || "friend"}</span></h1>
        <p className="text-muted-foreground mt-2">{profile?.organisation_type} · {profile?.phone} · Capacity {profile?.capacity} meals</p>
      </div>
      <div className="px-[5%] lg:px-[10%] py-10 space-y-10">
        {msg && <p className="card-box p-3 text-sm">{msg}</p>}
        {isHotel ? (
          <>
            <form onSubmit={add} className="card-box p-6 grid md:grid-cols-2 gap-3">
              <h2 className="md:col-span-2 text-2xl font-bold">List Surplus Food</h2>
              <input className="field" name="food_name" placeholder="Food (e.g. Veg biryani)" required />
              <input className="field" name="quantity" type="number" min={1} placeholder="Quantity (meals)" required />
              <input className="field md:col-span-2" name="pickup_address" placeholder="Pickup address" required />
              <label className="text-sm text-muted-foreground">Best before<input className="field mt-1" name="best_before" type="datetime-local" /></label>
              <textarea className="field" name="notes" placeholder="Notes (optional)" />
              <button className="btn btn-red md:col-span-2">Donate Food</button>
            </form>
            <List title="My Donations" rows={mine} orgs={orgs} render={(d) => (
              <>
                {d.status === "claimed" && <button className="btn" onClick={() => update(d.id, { status: "delivered" })}>Mark Picked Up</button>}
                {d.status === "available" && <button className="btn" onClick={() => remove(d.id)}>Remove</button>}
              </>
            )} />
          </>
        ) : (
          <>
            <List title="Available Food Near You" rows={available} orgs={orgs} render={(d) => (
              <button className="btn btn-red" onClick={() => update(d.id, { status: "claimed", claimed_by: user.id })}>Claim</button>
            )} />
            <List title="My Claims" rows={claimed} orgs={orgs} render={() => null} />
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function List({ title, rows, orgs, render }: { title: string; rows: Donation[]; orgs: Record<string, Profile>; render: (d: Donation) => React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {rows.length === 0 ? <p className="text-muted-foreground">Nothing here yet.</p> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((d) => {
            const donor = orgs[d.donor_id]; const ngo = d.claimed_by ? orgs[d.claimed_by] : null;
            return (
              <div key={d.id} className="card-box p-5 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-lg">{d.food_name}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${badge[d.status] ?? ""}`}>{d.status}</span>
                </div>
                <p className="text-sm"><strong className="text-primary">{d.quantity}</strong> meals · {donor?.organisation_name}</p>
                <p className="text-sm text-muted-foreground">📍 {d.pickup_address}</p>
                {d.best_before && <p className="text-sm text-muted-foreground">⏱ Best before {new Date(d.best_before).toLocaleString()}</p>}
                {d.notes && <p className="text-sm text-muted-foreground">{d.notes}</p>}
                {ngo && <p className="text-sm">Claimed by <strong>{ngo.organisation_name}</strong> · {ngo.phone}</p>}
                {d.status !== "available" && donor && <p className="text-sm">Donor contact: {donor.phone}</p>}
                <div className="flex gap-2 mt-auto pt-2">{render(d)}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
