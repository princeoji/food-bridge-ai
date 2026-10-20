import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { authErrorMessage, isOrganisationType, validateOrganisation } from "@/lib/auth-forms";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Organisation Profile — FoodBridge" }] }),
  component: Profile,
});

function Profile() {
  const { user } = Route.useRouteContext();
  const profile = useQuery({
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
  });
  return (
    <SiteLayout>
      <PageHero
        title={
          <>
            Your <span className="text-primary">Organisation</span>
          </>
        }
        sub="Keep your contact details and serving capacity per donation up to date."
      />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/dashboard" className="text-sm font-bold text-primary inline-block mb-3">
          ← Back to Dashboard
        </Link>
        {profile.isPending ? (
          <p role="status" className="card-box p-4 text-sm text-muted-foreground">
            Loading your profile…
          </p>
        ) : profile.isError ? (
          <div className="card-box p-4 grid gap-4">
            <p role="alert" className="text-sm text-destructive">
              {authErrorMessage(profile.error, "We could not load your profile. Please try again.")}
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => void profile.refetch()}
              disabled={profile.isFetching}
            >
              Try Again
            </button>
          </div>
        ) : (
          <ProfileForm key={user.id} profile={profile.data} user={user} />
        )}
      </div>
    </SiteLayout>
  );
}

function ProfileForm({ profile, user }: { profile: Tables<"profiles"> | null; user: User }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const metadata = user.user_metadata;
  const metadataString = (key: string) =>
    typeof metadata[key] === "string" ? (metadata[key] as string) : "";
  const organisationType = profile?.organisation_type || metadataString("organisation_type");
  const unsupportedRole = Boolean(profile && !isOrganisationType(profile.organisation_type));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const organisationName = String(f.get("organisationName") || "").trim();
    const phone = String(f.get("phone") || "").trim();
    const capacity = Number(f.get("capacity"));
    const role = profile?.organisation_type || String(f.get("organisationType") || "");
    const validationError = validateOrganisation(organisationName, phone, capacity);
    setErr("");
    setSaved(false);
    if (validationError) {
      setErr(validationError);
      return;
    }
    if (!isOrganisationType(role)) {
      setErr(
        profile
          ? "This account has an unsupported organisation type. Please contact the FoodBridge team for help."
          : "Choose a valid organisation type before continuing.",
      );
      return;
    }
    setBusy(true);
    try {
      const details = { organisation_name: organisationName, phone, capacity };
      const result = profile
        ? await supabase.from("profiles").update(details).eq("id", user.id).select("*").single()
        : await supabase
            .from("profiles")
            .insert({ id: user.id, ...details, organisation_type: role })
            .select("*")
            .single();
      if (result.error) throw result.error;
      queryClient.setQueryData(["profile", user.id], result.data);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      setSaved(true);
    } catch (error) {
      setErr(
        authErrorMessage(
          error,
          "We could not save your profile. Please try again. If the profile was just created in another tab, reload this page.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="card-box p-4 sm:p-5 grid gap-3"
      aria-busy={busy}
      onChange={() => setSaved(false)}
    >
      <div>
        <h2 className="text-2xl font-bold">
          {profile ? "Organisation details" : "Complete your profile"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {profile
            ? "These details help your donation partners coordinate with you."
            : "Your account is signed in. Add your organisation details to start donating or claiming food."}
        </p>
      </div>
      <div className="text-sm">
        <span className="font-bold">Account email</span>
        <p className="text-muted-foreground break-all mt-1">{user.email}</p>
      </div>
      {unsupportedRole && (
        <p role="alert" className="text-sm text-destructive">
          This account has an unsupported organisation type.{" "}
          <Link to="/contact" className="font-bold underline">
            Contact the FoodBridge team
          </Link>{" "}
          for help restoring access.
        </p>
      )}
      <label className="grid gap-1.5 text-sm font-bold" htmlFor="profile-name">
        Organisation / full name
        <input
          id="profile-name"
          className="field font-normal"
          name="organisationName"
          autoComplete="organization"
          minLength={2}
          maxLength={120}
          defaultValue={profile?.organisation_name || metadataString("organisation_name")}
          required
          disabled={busy}
        />
      </label>
      {profile ? (
        <div className="text-sm">
          <span className="font-bold">Organisation type</span>
          <p className="mt-1">{profile.organisation_type}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your organisation type is fixed for this account.
          </p>
        </div>
      ) : (
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="profile-type">
          Organisation type
          <select
            id="profile-type"
            className="field font-normal"
            name="organisationType"
            defaultValue={isOrganisationType(organisationType) ? organisationType : ""}
            required
            disabled={busy}
          >
            <option value="" disabled>
              Choose Hotel, NGO, or Volunteer
            </option>
            <option value="Hotel">Hotel / Restaurant</option>
            <option value="NGO">NGO</option>
            <option value="Volunteer">Volunteer</option>
          </select>
        </label>
      )}
      <label className="grid gap-1.5 text-sm font-bold" htmlFor="profile-phone">
        Contact phone
        <input
          id="profile-phone"
          className="field font-normal"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          defaultValue={profile?.phone || metadataString("phone")}
          required
          disabled={busy}
        />
      </label>
      {organisationType === "Volunteer" ? (
        <input type="hidden" name="capacity" value="0" />
      ) : (
        <>
          <label className="grid gap-1.5 text-sm font-bold" htmlFor="profile-capacity">
            Serving capacity (meals per donation)
            <input
              id="profile-capacity"
              className="field font-normal"
              name="capacity"
              type="number"
              min={0}
              max={1_000_000}
              step={1}
              defaultValue={
                profile?.capacity ??
                (Number.isSafeInteger(Number(metadata["capacity"]))
                  ? Number(metadata["capacity"])
                  : 0)
              }
              required
              disabled={busy}
              aria-describedby="profile-capacity-help"
            />
          </label>
          <p id="profile-capacity-help" className="text-xs text-muted-foreground -mt-3">
            NGOs can claim each donation up to their serving capacity. Set a capacity above zero to
            claim meals.
          </p>
        </>
      )}
      {err && (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm font-bold text-primary">
          Your organisation profile has been saved.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-red" disabled={busy || unsupportedRole}>
          {busy ? "Saving…" : profile ? "Save Changes" : "Complete Profile"}
        </button>
        <Link to="/dashboard" className="btn">
          Dashboard
        </Link>
      </div>
      <Link to="/update-password" className="text-sm font-bold text-primary">
        Change your password
      </Link>
    </form>
  );
}
