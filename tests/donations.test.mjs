import { test } from "node:test";
import assert from "node:assert/strict";
import { claimBlockedReason, donationInput, isExpired } from "../src/lib/donations.ts";

const now = Date.parse("2026-10-20T12:00:00Z");
const listing = { status: "available", quantity: 20, best_before: "2026-10-20T13:00:00Z" };

test("claims reject expired or undated food and listings above NGO capacity", () => {
  assert.equal(claimBlockedReason(listing, 20, now), null);
  assert.match(claimBlockedReason(listing, 19, now), /capacity/);
  assert.match(claimBlockedReason({ ...listing, status: "claimed" }, 100, now), /no longer/);
  assert.equal(isExpired({ best_before: null }, now), true);
  assert.equal(isExpired({ best_before: "invalid" }, now), true);
  assert.equal(isExpired({ best_before: new Date(now).toISOString() }, now), true);
});

test("donation input trims fields, preserves a future deadline, and validates boundaries", () => {
  function form(overrides = {}) {
    const value = new FormData();
    for (const [key, entry] of Object.entries({
      food_name: "  Vegetable rice  ",
      quantity: "20",
      pickup_address: "  Reception, 12 Main Road  ",
      best_before: "2026-10-20T13:00:00Z",
      notes: "  Contains dairy  ",
      ...overrides,
    }))
      value.set(key, entry);
    return value;
  }
  const input = donationInput(form(), now);
  assert.equal(input.food_name, "Vegetable rice");
  assert.equal(input.quantity, 20);
  assert.equal(input.notes, "Contains dairy");
  assert.equal(input.best_before, listing.best_before.replace("Z", ".000Z"));
  assert.throws(() => donationInput(form({ quantity: "1.5" }), now), /whole number/);
  assert.throws(() => donationInput(form({ quantity: "0" }), now), /whole number/);
  assert.throws(() => donationInput(form({ pickup_address: "    " }), now), /address/);
  assert.throws(() => donationInput(form({ best_before: "2026-10-20T11:59:59Z" }), now), /future/);
  assert.throws(() => donationInput(form({ best_before: "" }), now), /future/);
});
