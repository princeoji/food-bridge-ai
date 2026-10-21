import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Clock3,
  Download,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Utensils,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DonationStatus } from "@/components/dashboard/DonationStatus";
import { DeliveryDetails } from "@/components/dashboard/DeliveryDetails";
import { VolunteerDashboard } from "@/components/dashboard/VolunteerDashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { deadlineLabel, donationCsv } from "@/lib/dashboard";
import {
  claimBlockedReason,
  donationInput,
  errorMessage,
  isExpired,
  type Donation,
  type Profile,
} from "@/lib/donations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FoodBridge" },
      {
        name: "description",
        content: "Donate surplus meals, arrange collection, and track food deliveries.",
      },
    ],
  }),
  component: Dashboard,
});

const PAGE_SIZE = 12;
type DonationPage = { rows: Donation[]; organisations: Record<string, Profile>; total: number };
type Action = { kind: "remove" | "release"; donation: Donation };

async function withOrganisations(rows: Donation[], total: number): Promise<DonationPage> {
  const ids = [
    ...new Set(
      rows.flatMap((d) => [
        d.donor_id,
        ...(d.claimed_by ? [d.claimed_by] : []),
        ...(d.volunteer_id ? [d.volunteer_id] : []),
      ]),
    ),
  ];
  if (!ids.length) return { rows, organisations: {}, total };
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  return { rows, total, organisations: Object.fromEntries(data.map((p) => [p.id, p])) };
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const client = useQueryClient();
  const updatesRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const updates = new BroadcastChannel("foodbridge-donations");
    updatesRef.current = updates;
    updates.onmessage = () => {
      void client.invalidateQueries({ queryKey: ["donations"] });
      void client.invalidateQueries({ queryKey: ["public-impact-stats"] });
    };
    return () => {
      updatesRef.current = null;
      updates.close();
    };
  }, [client]);
  const [page, setPage] = useState(0);
  const [claimsPage, setClaimsPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("recommended");
  const [deadlineFilter, setDeadlineFilter] = useState("any");
  const [fitsCapacity, setFitsCapacity] = useState(false);
  const [claimsFilter, setClaimsFilter] = useState("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [activeSection, setActiveSection] = useState("overview");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (activeSection !== "new") return;
    const input = formRef.current?.elements.namedItem("food_name");
    if (input instanceof HTMLInputElement) input.focus({ preventScroll: true });
  }, [activeSection]);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [action, setAction] = useState<Action | null>(null);
  const [claimTarget, setClaimTarget] = useState<Donation | null>(null);
  const profileQuery = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: true,
  });
  const profile = profileQuery.data;
  const isHotel = profile?.organisation_type === "Hotel";
  const ready = !!profile && ["Hotel", "NGO"].includes(profile.organisation_type);
  const donationsQuery = useQuery({
    queryKey: [
      "donations",
      user.id,
      profile?.organisation_type,
      profile?.capacity,
      page,
      filter,
      searchTerm,
      sortOrder,
      deadlineFilter,
      fitsCapacity,
    ],
    enabled: ready,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let query = supabase.from("donations").select("*", { count: "exact" });
      if (isHotel) {
        query = query.eq("donor_id", user.id);
        if (filter === "active") query = query.in("status", ["claimed", "picked_up"]);
        else if (filter !== "all") query = query.eq("status", filter);
      } else {
        query = query.eq("status", "available").gt("best_before", new Date().toISOString());
        if (fitsCapacity) query = query.lte("quantity", profile?.capacity ?? 0);
      }
      if (deadlineFilter === "soon")
        query = query
          .gt("best_before", new Date().toISOString())
          .lte("best_before", new Date(Date.now() + 3 * 3600000).toISOString());
      if (deadlineFilter === "expired") query = query.lte("best_before", new Date().toISOString());
      if (deadlineFilter === "upcoming") query = query.gt("best_before", new Date().toISOString());
      const column =
        sortOrder === "largest"
          ? "quantity"
          : sortOrder === "newest"
            ? "created_at"
            : sortOrder === "deadline"
              ? "best_before"
              : isHotel
                ? "created_at"
                : "best_before";
      query = query
        .order(column, { ascending: column === "best_before", nullsFirst: false })
        .order("id", { ascending: false });
      if (isHotel && /^\d{6}$/.test(searchTerm)) query = query.eq("pickup_code", searchTerm);
      else if (searchTerm)
        query = query.ilike("food_name", "%" + searchTerm.replace(/[\\%_]/g, "\\$&") + "%");
      const { data, error, count } = await query.range(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE - 1,
      );
      if (error) throw error;
      return withOrganisations(data, count ?? 0);
    },
  });
  const claimsQuery = useQuery({
    queryKey: ["donations", "claims", user.id, claimsPage, claimsFilter],
    enabled: ready && !isHotel,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let query = supabase
        .from("donations")
        .select("*", { count: "exact" })
        .eq("claimed_by", user.id);
      if (claimsFilter === "active") query = query.in("status", ["claimed", "picked_up"]);
      else if (claimsFilter !== "all") query = query.eq("status", claimsFilter);
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(claimsPage * PAGE_SIZE, (claimsPage + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return withOrganisations(data, count ?? 0);
    },
  });

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  function showListings(status = "all") {
    setActiveSection("food");
    setFilter(status);
    setSearch("");
    setSearchTerm("");
    setDeadlineFilter(status === "available" ? "upcoming" : "any");
    setFitsCapacity(false);
    setPage(0);
    scrollToSection("dashboard-content");
  }

  function showClaims(status = "all") {
    setActiveSection("claims");
    setClaimsFilter(
      ["active", "claimed", "picked_up", "delivered"].includes(status) ? status : "all",
    );
    setClaimsPage(0);
    scrollToSection("dashboard-content");
  }

  function newDonation() {
    setActiveSection("new");
    scrollToSection("dashboard-content");
    const input = formRef.current?.elements.namedItem("food_name");
    if (input instanceof HTMLInputElement) input.focus({ preventScroll: true });
  }

  function sectionClass(section: string) {
    return (
      "pb-3 border-b-2 transition-colors " +
      (activeSection === section
        ? "border-primary text-primary"
        : "border-transparent hover:text-primary")
    );
  }

  function loadTemplate(donation: Donation) {
    const form = formRef.current;
    if (!form) return;
    const fields = {
      food_name: donation.food_name,
      quantity: String(donation.quantity),
      pickup_address: donation.pickup_address,
      notes: donation.notes ?? "",
      best_before: "",
    };
    for (const [key, value] of Object.entries(fields)) {
      const field = form.elements.namedItem(key);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)
        field.value = value;
    }
    setNotice({
      text: "Template loaded. Review the details and choose a new best-before time before publishing.",
      error: false,
    });
    newDonation();
  }

  function exportPage(rows: Donation[], name: string) {
    const url = URL.createObjectURL(
      new Blob([donationCsv(rows)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "foodbridge-" + name + "-page.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["donations"] }),
      client.invalidateQueries({ queryKey: ["public-impact-stats"] }),
    ]);
  }

  async function run(key: string, work: () => Promise<void>, success: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(key);
    setNotice(null);
    try {
      await work();
      updatesRef.current?.postMessage("changed");
      setNotice({ text: success, error: false });
      await refresh();
    } catch (error) {
      setNotice({ text: errorMessage(error), error: true });
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(
      "add",
      async () => {
        const input = donationInput(new FormData(form));
        const { error } = await supabase.from("donations").insert({ ...input, donor_id: user.id });
        if (error) throw error;
        form.reset();
        showListings("all");
      },
      "Donation listed. NGOs can now arrange collection with you.",
    );
  }

  async function claim(donation: Donation, address: string) {
    const reason = claimBlockedReason(donation, profile?.capacity ?? 0);
    if (reason) {
      setNotice({ text: reason, error: true });
      return;
    }
    await run(
      donation.id,
      async () => {
        const { data, error } = await supabase.rpc("claim_donation", {
          p_donation_id: donation.id,
          p_delivery_address: address,
        });
        if (error) throw error;
        if (!data?.id)
          throw new Error("This donation could not be claimed. Refresh and try again.");
        setClaimTarget(null);
        showClaims();
      },
      "Food claimed. Your pickup code is ready and volunteers can now accept the delivery.",
    );
  }

  async function confirmAction() {
    if (!action) return;
    const { donation, kind } = action;
    setAction(null);
    await run(
      donation.id,
      async () => {
        if (kind === "remove") {
          const { data, error } = await supabase
            .from("donations")
            .delete()
            .eq("id", donation.id)
            .eq("donor_id", user.id)
            .eq("status", "available")
            .select("id");
          if (error) throw error;
          if (!data?.length)
            throw new Error("This listing has changed. It may already have been claimed.");
        } else {
          const { data, error } = await supabase.rpc("release_donation", {
            p_donation_id: donation.id,
          });
          if (error) throw error;
          if (!data?.id) throw new Error("This donation has changed. Refresh and try again.");
        }
      },
      kind === "remove"
        ? "Donation removed."
        : "Claim released. Unexpired food is available again.",
    );
  }

  if (profile?.organisation_type === "Volunteer") return <VolunteerDashboard profile={profile} />;

  return (
    <SiteLayout>
      <section className="bg-secondary px-[5%] lg:px-[7%] pt-5 pb-0 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-primary font-bold mb-3 text-sm uppercase tracking-widest">
              {isHotel
                ? "Hotel partner dashboard"
                : profile
                  ? "NGO partner dashboard"
                  : "Your food rescue dashboard"}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold">
              Welcome, {profile?.organisation_name || "friend"}
            </h1>
            {profile && (
              <p className="text-muted-foreground mt-3">
                {isHotel ? "Food donor" : "NGO partner"} · Serving capacity:{" "}
                {profile.capacity.toLocaleString()} meals per donation
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/profile" className="btn">
              Organisation profile
            </Link>
            {ready && (
              <button
                className="btn btn-red"
                onClick={isHotel ? newDonation : () => showListings()}
              >
                <Plus size={17} />
                {isHotel ? "New donation" : "Find food"}
              </button>
            )}
          </div>
        </div>
        <nav
          aria-label="Dashboard sections"
          className="flex gap-4 overflow-x-auto mt-5 text-sm font-bold whitespace-nowrap"
        >
          <button
            type="button"
            className={sectionClass("overview")}
            aria-pressed={activeSection === "overview"}
            onClick={() => setActiveSection("overview")}
          >
            Overview
          </button>
          {isHotel && (
            <button
              type="button"
              className={sectionClass("new")}
              aria-pressed={activeSection === "new"}
              onClick={newDonation}
            >
              Donate food
            </button>
          )}
          <button
            type="button"
            className={sectionClass("food")}
            aria-pressed={activeSection === "food"}
            onClick={() => showListings()}
          >
            {isHotel ? "My donations" : "Browse food"}
          </button>
          {!isHotel && (
            <button
              type="button"
              className={sectionClass("claims")}
              aria-pressed={activeSection === "claims"}
              onClick={() => showClaims()}
            >
              My pickups
            </button>
          )}
          <Link to="/profile" className="pb-4 hover:text-primary">
            Settings
          </Link>
          <Link to="/contact" className="pb-4 hover:text-primary">
            Help & support
          </Link>
        </nav>
      </section>
      <div
        id="dashboard-content"
        className="bg-workspace min-h-[60vh] px-[5%] lg:px-[7%] py-6 space-y-5 scroll-mt-20"
      >
        {notice && (
          <div
            role={notice.error ? "alert" : "status"}
            className={
              "card-box p-4 " +
              (notice.error ? "border-destructive text-destructive" : "text-foreground")
            }
          >
            {notice.text}
          </div>
        )}
        {profileQuery.isPending ? (
          <p role="status">Loading your organisation…</p>
        ) : profileQuery.isError ? (
          <ErrorState error={profileQuery.error} retry={() => profileQuery.refetch()} />
        ) : !ready ? (
          <div className="card-box p-5 space-y-3">
            <h2 className="text-2xl font-bold">Complete your organisation profile</h2>
            <p className="text-muted-foreground">
              Tell us about your organisation before listing or claiming food.
            </p>
            <Link to="/profile" className="btn btn-red">
              Complete profile
            </Link>
          </div>
        ) : (
          <>
            <div
              hidden={activeSection !== "overview"}
              style={activeSection === "overview" ? undefined : { display: "none" }}
            >
              <DashboardOverview
                profile={profile}
                onListings={showListings}
                onClaims={showClaims}
                onNew={newDonation}
                onRepeat={loadTemplate}
              />
            </div>
            {isHotel ? (
              <form
                id="new-donation"
                hidden={activeSection !== "new"}
                style={activeSection === "new" ? undefined : { display: "none" }}
                ref={formRef}
                onSubmit={add}
                className="card-box scroll-mt-28 p-4 md:p-5 grid md:grid-cols-2 gap-3"
              >
                <div className="md:col-span-2">
                  <h2 className="text-2xl font-bold">List surplus food</h2>
                  <p className="text-muted-foreground mt-2">
                    Offer food you can safely share. Include storage, allergens, and collection
                    instructions in the notes.
                  </p>
                </div>
                <label className="font-bold text-sm">
                  Food name
                  <input
                    className="field mt-2"
                    name="food_name"
                    placeholder="e.g. Fresh vegetable biryani"
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </label>
                <label className="font-bold text-sm">
                  Quantity in meals
                  <input
                    className="field mt-2"
                    name="quantity"
                    type="number"
                    min={1}
                    max={1000000}
                    step={1}
                    placeholder="e.g. 25"
                    required
                  />
                </label>
                <label className="font-bold text-sm md:col-span-2">
                  Pickup address
                  <input
                    className="field mt-2"
                    name="pickup_address"
                    minLength={5}
                    maxLength={500}
                    autoComplete="street-address"
                    required
                  />
                </label>
                <label className="font-bold text-sm">
                  Best before
                  <input
                    className="field mt-2"
                    name="best_before"
                    type="datetime-local"
                    aria-describedby="deadline-help"
                    required
                  />
                  <span id="deadline-help" className="block text-muted-foreground font-normal mt-2">
                    Your local time. Food cannot be claimed after this deadline.
                  </span>
                </label>
                <label className="font-bold text-sm">
                  Collection notes
                  <textarea
                    className="field mt-2"
                    name="notes"
                    maxLength={2000}
                    placeholder="Allergens, storage, packaging, and a contact person"
                  />
                </label>
                <button className="btn btn-red md:col-span-2 justify-self-start" disabled={!!busy}>
                  <Utensils size={17} className="mr-2" />
                  {busy === "add" ? "Listing food…" : "Donate food"}
                </button>
              </form>
            ) : (
              <div
                hidden={activeSection !== "food"}
                style={activeSection === "food" ? undefined : { display: "none" }}
                className="card-box p-4 flex flex-wrap gap-4 items-center justify-between"
              >
                <div>
                  <h2 className="font-bold text-lg">Find your next food rescue</h2>
                  <p className="text-muted-foreground mt-1">
                    Listings are ordered by collection deadline. Confirm the address with the donor
                    before travelling.
                  </p>
                </div>
                <Link to="/profile" className="text-primary font-bold">
                  Update serving capacity →
                </Link>
              </div>
            )}
            <section
              id="food-list"
              hidden={activeSection !== "food"}
              style={activeSection === "food" ? undefined : { display: "none" }}
              className="space-y-3 scroll-mt-28"
              aria-labelledby="list-title"
            >
              <div className="flex flex-wrap justify-between gap-4 items-center">
                <h2 id="list-title" className="text-2xl font-bold">
                  {isHotel ? "My donations" : "Available food"}
                </h2>
                <div className="flex flex-wrap gap-2 items-center">
                  <div
                    className="flex border border-border rounded-lg p-1"
                    role="group"
                    aria-label="Listing layout"
                  >
                    <button
                      className={
                        "min-h-11 min-w-11 p-2 rounded-md " +
                        (layout === "grid" ? "bg-accent text-primary" : "text-muted-foreground")
                      }
                      onClick={() => setLayout("grid")}
                      aria-label="Grid view"
                      aria-pressed={layout === "grid"}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      className={
                        "min-h-11 min-w-11 p-2 rounded-md " +
                        (layout === "list" ? "bg-accent text-primary" : "text-muted-foreground")
                      }
                      onClick={() => setLayout("list")}
                      aria-label="List view"
                      aria-pressed={layout === "list"}
                    >
                      <List size={18} />
                    </button>
                  </div>
                  <button
                    className="btn"
                    disabled={!donationsQuery.data?.rows.length}
                    onClick={() =>
                      exportPage(
                        donationsQuery.data?.rows ?? [],
                        isHotel ? "donations" : "available-food",
                      )
                    }
                  >
                    <Download size={16} />
                    Export page
                  </button>
                  <button
                    className="btn"
                    disabled={donationsQuery.isFetching || !!busy}
                    onClick={() => void refresh()}
                  >
                    <RefreshCw
                      size={16}
                      className={"mr-2 " + (donationsQuery.isFetching ? "animate-spin" : "")}
                    />
                    Refresh
                  </button>
                </div>
              </div>
              <form
                className="card-box p-4 md:p-4 flex flex-wrap items-end gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchTerm(search.trim());
                  setPage(0);
                }}
              >
                <label className="flex-1 min-w-0 text-sm font-bold">
                  {isHotel ? "Search food or pickup code" : "Search food"}
                  <input
                    className="field mt-2"
                    type="search"
                    maxLength={100}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      isHotel ? "Food name or 6-digit pickup code" : "Search by food name"
                    }
                  />
                </label>
                {isHotel && (
                  <label className="text-sm font-bold">
                    Status
                    <select
                      className="field mt-2"
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="active">Active deliveries</option>
                      <option value="available">Available</option>
                      <option value="claimed">Claimed</option>
                      <option value="picked_up">Picked up / On the way</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </label>
                )}
                <label className="text-sm font-bold">
                  Sort by
                  <select
                    className="field mt-2"
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="recommended">
                      {isHotel ? "Latest first" : "Collection priority"}
                    </option>
                    <option value="deadline">Earliest deadline</option>
                    <option value="newest">Newest listings</option>
                    <option value="largest">Most meals</option>
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Collection window
                  <select
                    className="field mt-2"
                    value={deadlineFilter}
                    onChange={(e) => {
                      setDeadlineFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="any">Any time</option>
                    <option value="upcoming">Before deadline</option>
                    <option value="soon">Within 3 hours</option>
                    {isHotel && <option value="expired">Past deadline</option>}
                  </select>
                </label>
                <button className="btn btn-red" type="submit">
                  <SlidersHorizontal size={16} />
                  Apply search
                </button>
                <div className="basis-full flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    {!isHotel && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--primary)]"
                          checked={fitsCapacity}
                          onChange={(e) => {
                            setFitsCapacity(e.target.checked);
                            setPage(0);
                          }}
                        />
                        Within my capacity ({profile.capacity} meals)
                      </label>
                    )}
                  </div>
                  <button
                    type="button"
                    className="font-bold text-primary"
                    onClick={() => {
                      setSearch("");
                      setSearchTerm("");
                      setSortOrder("recommended");
                      setDeadlineFilter("any");
                      setFitsCapacity(false);
                      setFilter("all");
                      setPage(0);
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              </form>
              {donationsQuery.isPending ? (
                <p role="status">Loading donations…</p>
              ) : donationsQuery.isError ? (
                <ErrorState error={donationsQuery.error} retry={() => donationsQuery.refetch()} />
              ) : (
                donationsQuery.data && (
                  <>
                    <DonationList
                      role={isHotel ? "Hotel" : "NGO"}
                      layout={layout}
                      data={donationsQuery.data}
                      empty={
                        searchTerm
                          ? "No food matches your search."
                          : isHotel
                            ? "Your food rescue journey starts with your first donation."
                            : "No food is available right now. Check back soon."
                      }
                      render={(d) => {
                        if (isHotel)
                          return (
                            <>
                              <button
                                className="btn"
                                disabled={!!busy}
                                onClick={() => loadTemplate(d)}
                              >
                                Use as template
                              </button>
                              {d.status === "available" ? (
                                <button
                                  className="btn"
                                  disabled={!!busy}
                                  onClick={() => setAction({ kind: "remove", donation: d })}
                                >
                                  Remove listing
                                </button>
                              ) : d.status === "claimed" ? (
                                <p className="text-sm text-muted-foreground">
                                  Match the volunteer's pickup code below before handing over food.
                                </p>
                              ) : null}
                            </>
                          );
                        const reason = claimBlockedReason(d, profile.capacity);
                        return (
                          <>
                            <button
                              className="btn btn-red"
                              disabled={!!busy || !!reason}
                              onClick={() => setClaimTarget(d)}
                            >
                              {busy === d.id ? "Claiming…" : "Claim food"}
                            </button>
                            {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
                          </>
                        );
                      }}
                    />
                    <Pagination page={page} total={donationsQuery.data.total} setPage={setPage} />
                  </>
                )
              )}
            </section>
            {!isHotel && (
              <section
                id="my-claims"
                hidden={activeSection !== "claims"}
                style={activeSection === "claims" ? undefined : { display: "none" }}
                className="space-y-3 scroll-mt-28"
                aria-labelledby="claims-title"
              >
                <div className="flex flex-wrap gap-4 justify-between items-center">
                  <h2 id="claims-title" className="text-2xl font-bold">
                    My claims
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    <label className="sr-only" htmlFor="claims-status">
                      Filter claims
                    </label>
                    <select
                      id="claims-status"
                      className="field w-auto"
                      value={claimsFilter}
                      onChange={(e) => {
                        setClaimsFilter(e.target.value);
                        setClaimsPage(0);
                      }}
                    >
                      <option value="all">All my claims</option>
                      <option value="active">Active deliveries</option>
                      <option value="claimed">Awaiting collection</option>
                      <option value="picked_up">On the way</option>
                      <option value="delivered">Delivered</option>
                    </select>
                    <button
                      className="btn"
                      disabled={!claimsQuery.data?.rows.length}
                      onClick={() => exportPage(claimsQuery.data?.rows ?? [], "claims")}
                    >
                      <Download size={16} />
                      Export page
                    </button>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Volunteers collect your food using its pickup code. The hotel confirms pickup, and
                  the volunteer finishes delivery. You can release a claim before a volunteer
                  accepts it.
                </p>
                {claimsQuery.isPending ? (
                  <p role="status">Loading your claims…</p>
                ) : claimsQuery.isError ? (
                  <ErrorState error={claimsQuery.error} retry={() => claimsQuery.refetch()} />
                ) : (
                  claimsQuery.data && (
                    <>
                      <DonationList
                        role="NGO"
                        layout={layout}
                        data={claimsQuery.data}
                        empty="Food you claim will appear here with the donor's contact details."
                        render={(d) =>
                          d.status === "claimed" && !d.volunteer_id ? (
                            <>
                              <button
                                className="btn"
                                disabled={!!busy}
                                onClick={() => setAction({ kind: "release", donation: d })}
                              >
                                Release claim
                              </button>
                            </>
                          ) : null
                        }
                      />
                      <Pagination
                        page={claimsPage}
                        total={claimsQuery.data.total}
                        setPage={setClaimsPage}
                      />
                    </>
                  )
                )}
              </section>
            )}
            <p className="text-sm text-muted-foreground">
              Listings refresh every 10 seconds and when you return to this window.
              {donationsQuery.dataUpdatedAt > 0 && (
                <>
                  {" "}
                  Last synced{" "}
                  {new Date(donationsQuery.dataUpdatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  .
                </>
              )}
            </p>
          </>
        )}
      </div>
      <Dialog
        open={!!claimTarget}
        onOpenChange={(open) => {
          if (!open) setClaimTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim {claimTarget?.food_name}</DialogTitle>
            <DialogDescription>
              Enter where your NGO will receive the food. A volunteer will collect it from the hotel
              using a unique six-digit pickup code.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (claimTarget)
                void claim(
                  claimTarget,
                  String(new FormData(event.currentTarget).get("address") ?? "").trim(),
                );
            }}
          >
            <label className="grid gap-2 font-bold text-sm">
              NGO delivery address
              <textarea
                name="address"
                className="field"
                minLength={5}
                maxLength={500}
                required
                disabled={!!busy}
                placeholder="Building, street, area, city, and postcode"
              />
            </label>
            {notice?.error && (
              <p role="alert" className="text-sm text-destructive">
                {notice.text}
              </p>
            )}
            <button className="btn btn-red" disabled={!!busy}>
              {busy ? "Claiming…" : "Claim food & request delivery"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action?.kind === "remove"
                ? "Remove this listing?"
                : action?.kind === "release"
                  ? "Release this claim?"
                  : "Confirm food was delivered?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action?.kind === "remove"
                ? "This available listing will be removed. You can create a new donation later."
                : action?.kind === "release"
                  ? "The food will be offered to other NGOs if its collection deadline has not passed. Let the donor know if you already arranged a pickup."
                  : "Confirm only after collecting and distributing this food. Delivered meals count toward FoodBridge's impact."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep as it is</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmAction()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SiteLayout>
  );
}

function ErrorState({ error, retry }: { error: unknown; retry: () => unknown }) {
  return (
    <div className="card-box border-destructive p-4" role="alert">
      <p className="text-destructive">{errorMessage(error)}</p>
      <button className="btn mt-3" onClick={() => void retry()}>
        Try again
      </button>
    </div>
  );
}

function Pagination({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (page: number) => void;
}) {
  if (total <= PAGE_SIZE && page === 0) return null;
  return (
    <nav aria-label="Donation pages" className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        Page {page + 1} · {total} listings
      </span>
      <div className="flex gap-2">
        <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <button
          className="btn"
          disabled={(page + 1) * PAGE_SIZE >= total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function DonationList({
  role,
  data,
  empty,
  render,
  layout = "grid",
}: {
  role: "Hotel" | "NGO";
  data: DonationPage;
  empty: string;
  render: (donation: Donation) => ReactNode;
  layout?: "grid" | "list";
}) {
  return data.rows.length === 0 ? (
    <div className="card-box p-5 text-center text-muted-foreground">{empty}</div>
  ) : (
    <div className={layout === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3 gap-3" : "grid gap-4"}>
      {data.rows.map((d) => {
        const donor = data.organisations[d.donor_id];
        const ngo = d.claimed_by ? data.organisations[d.claimed_by] : null;
        const expired = d.status === "available" && isExpired(d);
        return (
          <article key={d.id} className="card-box p-4 flex flex-col gap-3 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-lg break-words">{d.food_name}</h3>
              <DonationStatus status={d.status} expired={expired} />
            </div>
            <p>
              <strong className="text-foreground text-xl">{d.quantity.toLocaleString()}</strong>{" "}
              meals · {donor?.organisation_name || "Food partner"}
            </p>
            <p className="text-sm text-muted-foreground flex items-start gap-2 break-words">
              <MapPin size={16} className="shrink-0 mt-0.5" />
              {d.pickup_address}
            </p>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Clock3 size={16} className="shrink-0 mt-0.5" />
              {d.best_before
                ? "Best before " + new Date(d.best_before).toLocaleString()
                : "No collection deadline — please relist this food"}
            </p>
            {d.status === "available" && !expired && (
              <p className="text-xs font-bold text-warning">{deadlineLabel(d.best_before)}</p>
            )}
            <details className="text-sm rounded-lg bg-secondary p-3">
              <summary className="font-bold cursor-pointer">Food & pickup details</summary>
              <div className="mt-3 space-y-2">
                <p className="text-muted-foreground">
                  Listed {new Date(d.created_at).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {d.notes || "No additional collection notes."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Confirm packaging, allergens, and collection details with your donation partner.
                </p>
              </div>
            </details>
            {ngo && (
              <p className="text-sm">
                Claimed by <strong>{ngo.organisation_name}</strong> ·{" "}
                <a
                  className="text-primary underline"
                  href={"tel:" + ngo.phone.replace(/[^+\d]/g, "")}
                >
                  {ngo.phone}
                </a>
              </p>
            )}
            {d.status !== "available" && donor && (
              <p className="text-sm">
                Donor:{" "}
                <a
                  className="text-primary underline"
                  href={"tel:" + donor.phone.replace(/[^+\d]/g, "")}
                >
                  {donor.phone}
                </a>
              </p>
            )}
            {d.volunteer_id && data.organisations[d.volunteer_id] && (
              <p className="text-sm">
                Volunteer: <strong>{data.organisations[d.volunteer_id]!.organisation_name}</strong>{" "}
                ·{" "}
                <a
                  className="text-primary underline"
                  href={"tel:" + data.organisations[d.volunteer_id]!.phone.replace(/[^+\d]/g, "")}
                >
                  {data.organisations[d.volunteer_id]!.phone}
                </a>
              </p>
            )}
            <DeliveryDetails donation={d} role={role} />
            <div className="mt-auto pt-3 flex flex-wrap gap-2">{render(d)}</div>
          </article>
        );
      })}
    </div>
  );
}
