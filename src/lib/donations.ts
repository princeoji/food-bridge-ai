import type { Tables } from "../integrations/supabase/types";

export type Donation = Tables<"donations">;
export type Profile = Tables<"profiles">;

export function isExpired(donation: Pick<Donation, "best_before">, now = Date.now()) {
  return (
    !donation.best_before ||
    !Number.isFinite(Date.parse(donation.best_before)) ||
    Date.parse(donation.best_before) <= now
  );
}

export function claimBlockedReason(donation: Donation, capacity: number, now = Date.now()) {
  if (donation.status !== "available") return "This donation is no longer available.";
  if (isExpired(donation, now)) return "The collection deadline has passed.";
  if (capacity < donation.quantity)
    return "Increase your serving capacity in your profile to claim this donation.";
  return null;
}

export function donationInput(form: FormData, now = Date.now()) {
  const food_name = String(form.get("food_name") ?? "").trim();
  const pickup_address = String(form.get("pickup_address") ?? "").trim();
  const quantity = Number(form.get("quantity"));
  const notes = String(form.get("notes") ?? "").trim();
  const bestBefore = new Date(String(form.get("best_before") ?? ""));
  if (food_name.length < 2 || food_name.length > 120)
    throw new Error("Use 2–120 characters for the food name.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000)
    throw new Error("Enter a whole number of meals between 1 and 1,000,000.");
  if (pickup_address.length < 5 || pickup_address.length > 500)
    throw new Error("Enter a pickup address between 5 and 500 characters.");
  if (!Number.isFinite(bestBefore.getTime()) || bestBefore.getTime() <= now)
    throw new Error("Choose a best-before time in the future.");
  if (notes.length > 2000) throw new Error("Keep notes within 2,000 characters.");
  return {
    food_name,
    pickup_address,
    quantity,
    notes: notes || null,
    best_before: bestBefore.toISOString(),
  };
}

export function errorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error && error.code === "PGRST202")
    return "This action is unavailable because the database update has not been applied. Please ask the project administrator to finish the FoodBridge database setup.";
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string")
    return error.message;
  return "We couldn't complete that request. Check your connection and try again.";
}
