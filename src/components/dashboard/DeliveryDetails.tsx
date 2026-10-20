import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, type Donation } from "@/lib/donations";

export function DeliveryDetails({ donation: d, role }: { donation: Donation; role: string }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    pending.current = true;
    setBusy(true);
    setNotice("");
    try {
      const result =
        role === "Hotel"
          ? await supabase.rpc("confirm_pickup", {
              p_donation_id: d.id,
              p_pickup_code: String(fields.get("code") ?? "").trim(),
            })
          : role === "NGO"
            ? await supabase.rpc("set_delivery_address", {
                p_donation_id: d.id,
                p_address: String(fields.get("address") ?? "").trim(),
              })
            : await supabase.rpc("complete_donation", { p_donation_id: d.id });
      if (result.error) throw result.error;
      if (!result.data?.id) throw new Error("The order was not updated. Refresh and try again.");
      setFailed(false);
      setNotice(
        role === "Hotel"
          ? "Pickup confirmed. The volunteer can now deliver this food."
          : role === "NGO"
            ? "Delivery address saved. Volunteers can now accept this order."
            : "Delivery completed. Thank you for helping your community!",
      );
      form.reset();
      if (typeof BroadcastChannel !== "undefined") {
        const updates = new BroadcastChannel("foodbridge-donations");
        updates.postMessage("changed");
        updates.close();
      }
    } catch (error) {
      setFailed(true);
      setNotice(errorMessage(error));
    } finally {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["donations"] }),
        client.invalidateQueries({ queryKey: ["public-impact-stats"] }),
      ]);
      pending.current = false;
      setBusy(false);
    }
  }

  if (d.status === "available") return null;
  const stage =
    d.status === "delivered"
      ? "Delivered"
      : d.status === "picked_up"
        ? "Picked up · On the way"
        : d.volunteer_id
          ? "Volunteer assigned · Awaiting pickup"
          : "Waiting for a volunteer";
  return (
    <div className="w-full rounded-lg bg-secondary p-3 space-y-3 text-sm">
      <p className="font-bold text-primary">{stage}</p>
      {d.pickup_code && (
        <div>
          <p className="text-xs text-muted-foreground">Pickup code · Show this to the hotel</p>
          <strong className="block text-xl tracking-[0.2em] tabular-nums">{d.pickup_code}</strong>
        </div>
      )}
      {d.delivery_address && (
        <p>
          <strong>Deliver to:</strong> {d.delivery_address}
        </p>
      )}
      <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Delivery progress">
        {["NGO claimed", "Volunteer accepted", "Hotel confirmed pickup", "Delivered"].map(
          (label, index) => {
            const complete =
              index === 0 ||
              (index === 1 && !!d.volunteer_id) ||
              (index === 2 && !!d.picked_up_at) ||
              (index === 3 && d.status === "delivered");
            return (
              <li
                key={label}
                className={complete ? "text-primary font-bold" : "text-muted-foreground"}
              >
                {complete ? "✓" : "○"} {label}
              </li>
            );
          },
        )}
      </ol>
      {d.picked_up_at && (
        <p className="text-xs text-muted-foreground">
          Picked up {new Date(d.picked_up_at).toLocaleString()}
        </p>
      )}
      {d.delivered_at && (
        <p className="text-xs text-muted-foreground">
          Delivered {new Date(d.delivered_at).toLocaleString()}
        </p>
      )}
      {role === "Hotel" && d.status === "claimed" && d.volunteer_id && (
        <form onSubmit={submit} className="space-y-2">
          <label className="grid gap-1 font-bold">
            Code provided by the volunteer
            <input
              name="code"
              className="field font-normal"
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              autoComplete="off"
              placeholder="Enter the 6-digit code"
              required
              disabled={busy}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Check the volunteer's identity before handing over safely packed food.
          </p>
          <button className="btn btn-red" disabled={busy}>
            {busy ? "Confirming…" : "Verify code & mark picked up"}
          </button>
        </form>
      )}
      {role === "NGO" && d.status === "claimed" && !d.volunteer_id && (
        <form onSubmit={submit} className="space-y-2">
          <label className="grid gap-1 font-bold">
            NGO delivery address
            <input
              name="address"
              className="field font-normal"
              defaultValue={d.delivery_address ?? ""}
              minLength={5}
              maxLength={500}
              autoComplete="street-address"
              required
              disabled={busy}
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "Saving…" : "Save delivery address"}
          </button>
        </form>
      )}
      {role === "Volunteer" && d.status === "claimed" && (
        <p className="text-muted-foreground">
          Give the pickup code to the hotel. Delivery confirmation unlocks after the hotel marks
          this order picked up.
        </p>
      )}
      {role === "Volunteer" && d.status === "picked_up" && (
        <form onSubmit={submit} className="space-y-2">
          <label className="flex items-start gap-2">
            <input type="checkbox" required disabled={busy} className="mt-1" />I have handed this
            food to the receiving NGO at the delivery address.
          </label>
          <button className="btn btn-red" disabled={busy}>
            {busy ? "Completing…" : "Finish delivery"}
          </button>
        </form>
      )}
      {notice && (
        <p
          role={failed ? "alert" : "status"}
          className={failed ? "text-destructive" : "text-primary"}
        >
          {notice}
        </p>
      )}
    </div>
  );
}
