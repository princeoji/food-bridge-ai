// Explicit opt-in only: this creates a completed QA order and contact message.
// Available QA listings are cleaned by their donor; completed rows require admin cleanup.
// Never run this against an unrelated database or with real organisation accounts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.FOODBRIDGE_RUN_HOSTED_CHECKS !== "1")
  throw new Error("Set FOODBRIDGE_RUN_HOSTED_CHECKS=1 to explicitly enable hosted writes.");
const password = process.env.FOODBRIDGE_TEST_PASSWORD;
if (!password) throw new Error("Set FOODBRIDGE_TEST_PASSWORD for the dedicated test accounts.");
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Load the project's Supabase public configuration first.");
const safeFetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (key.startsWith("sb_publishable_") && headers.get("Authorization") === "Bearer " + key)
    headers.delete("Authorization");
  headers.set("apikey", key);
  return fetch(input, { ...init, headers, signal: AbortSignal.timeout(20000) });
};
const make = () =>
  createClient(url, key, {
    global: { fetch: safeFetch },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
const hotel = make(),
  ngo = make(),
  volunteer = make(),
  anonymous = make();
const runId = randomUUID();
const report = { runId, checks: [], cleanup: { donationIds: [], contactEmail: null } };
const fixtures = new Set();
const ok = (result) => {
  if (result.error) throw result.error;
  return result.data;
};
const pass = (label) => {
  report.checks.push(label);
  console.log("PASS " + label);
};
const denied = (result, code, label) => {
  assert.equal(result.error?.code, code, label);
  pass(label);
};
const sessionUser = async (client, email, role) => {
  const user = ok(await client.auth.signInWithPassword({ email, password })).user;
  const profile = ok(await client.from("profiles").select("*").eq("id", user.id).single());
  assert.equal(profile.organisation_type, role);
  pass(role + " login and profile");
  return profile;
};

try {
  const donor = await sessionUser(hotel, "testhotel@foodhope.test", "Hotel");
  const receiver = await sessionUser(ngo, "testngo@foodhope.test", "NGO");
  const courier = await sessionUser(volunteer, "testvolunteer@foodbridge.test", "Volunteer");
  const before = ok(await anonymous.rpc("impact_stats"));
  const create = async (quantity) => {
    const row = ok(
      await hotel
        .from("donations")
        .insert({
          donor_id: donor.id,
          food_name: "QA WORKFLOW " + runId,
          quantity,
          pickup_address: "QA hotel reception — do not collect",
          best_before: new Date(Date.now() + 3600000).toISOString(),
          notes: "Disposable workflow verification: " + runId,
        })
        .select("*")
        .single(),
    );
    fixtures.add(row.id);
    return row;
  };
  const main = await create(1);
  assert.equal(ok(await ngo.from("donations").select("id").eq("id", main.id).single()).id, main.id);
  pass("Hotel posts food; NGO sees the same listing");
  denied(
    await hotel.rpc("claim_donation", {
      p_donation_id: main.id,
      p_delivery_address: "QA NGO reception",
    }),
    "42501",
    "Hotel cannot claim NGO food",
  );
  denied(
    await ngo.rpc("claim_donation", { p_donation_id: main.id }),
    "22023",
    "NGO delivery address is required",
  );
  const tooLarge = await create(receiver.capacity + 1);
  denied(
    await ngo.rpc("claim_donation", {
      p_donation_id: tooLarge.id,
      p_delivery_address: "QA NGO reception",
    }),
    "22023",
    "NGO capacity enforced by database",
  );
  const unsafe = await hotel.from("donations").insert({
    donor_id: donor.id,
    food_name: "QA expired " + runId,
    quantity: 1,
    pickup_address: "QA address",
    best_before: new Date(Date.now() - 60000).toISOString(),
  });
  assert.ok(unsafe.error);
  pass("Hotel cannot publish expired food");
  denied(
    await anonymous.rpc("claim_donation", {
      p_donation_id: main.id,
      p_delivery_address: "QA NGO reception",
    }),
    "42501",
    "Anonymous claims blocked",
  );
  const claimed = ok(
    await ngo.rpc("claim_donation", {
      p_donation_id: main.id,
      p_delivery_address: "QA NGO reception — do not deliver",
    }),
  );
  assert.match(claimed.pickup_code, /^[0-9]{6}$/);
  assert.equal(claimed.claimed_by, receiver.id);
  assert.equal(
    ok(await hotel.from("donations").select("id").eq("pickup_code", claimed.pickup_code).single())
      .id,
    main.id,
  );
  pass("NGO claim creates six-digit code searchable by Hotel");
  denied(
    await ngo.rpc("claim_donation", {
      p_donation_id: main.id,
      p_delivery_address: "QA NGO reception",
    }),
    "55000",
    "Duplicate claim blocked",
  );
  const released = ok(await ngo.rpc("release_donation", { p_donation_id: main.id }));
  assert.equal(released.pickup_code, null);
  assert.equal(released.status, "available");
  const reclaimed = ok(
    await ngo.rpc("claim_donation", {
      p_donation_id: main.id,
      p_delivery_address: "QA NGO reception — do not deliver",
    }),
  );
  assert.notEqual(reclaimed.pickup_code, claimed.pickup_code);
  pass("Release and reclaim generate a fresh unique code");
  ok(
    await ngo.rpc("set_delivery_address", {
      p_donation_id: main.id,
      p_address: "QA updated NGO reception — do not deliver",
    }),
  );
  pass("NGO can update destination before volunteer accepts");
  const queue = ok(await volunteer.rpc("available_deliveries", { p_offset: 0 }));
  assert.ok(queue.some((row) => row.id === main.id));
  assert.ok(queue.every((row) => !("pickup_code" in row)));
  assert.equal(ok(await volunteer.from("donations").select("id").eq("id", main.id)).length, 0);
  pass("Volunteer queue shows order without leaking pickup code");
  const acceptance = await Promise.all([
    volunteer.rpc("accept_delivery", { p_donation_id: main.id }),
    volunteer.rpc("accept_delivery", { p_donation_id: main.id }),
  ]);
  assert.equal(acceptance.filter((r) => !r.error).length, 1);
  assert.equal(acceptance.find((r) => r.error)?.error.code, "55000");
  pass("Concurrent acceptance has exactly one winner");
  const assigned = ok(await volunteer.from("donations").select("*").eq("id", main.id).single());
  assert.equal(assigned.volunteer_id, courier.id);
  assert.equal(assigned.pickup_code, reclaimed.pickup_code);
  assert.equal(
    ok(await volunteer.from("profiles").select("id").in("id", [donor.id, receiver.id])).length,
    2,
  );
  pass("Assigned volunteer sees matching code and both partner contacts");
  denied(
    await ngo.rpc("release_donation", { p_donation_id: main.id }),
    "55000",
    "NGO cannot release an accepted delivery",
  );
  denied(
    await ngo.rpc("set_delivery_address", {
      p_donation_id: main.id,
      p_address: "Moved destination",
    }),
    "55000",
    "Accepted destination cannot be changed",
  );
  denied(
    await volunteer.rpc("complete_donation", { p_donation_id: main.id }),
    "55000",
    "Delivery blocked until Hotel confirms pickup",
  );
  denied(
    await volunteer.rpc("confirm_pickup", {
      p_donation_id: main.id,
      p_pickup_code: reclaimed.pickup_code,
    }),
    "42501",
    "Volunteer cannot impersonate Hotel pickup",
  );
  denied(
    await hotel.rpc("confirm_pickup", { p_donation_id: main.id, p_pickup_code: "000000" }),
    "22023",
    "Incorrect six-digit code rejected",
  );
  const picked = ok(
    await hotel.rpc("confirm_pickup", {
      p_donation_id: main.id,
      p_pickup_code: reclaimed.pickup_code,
    }),
  );
  assert.equal(picked.status, "picked_up");
  assert.ok(picked.picked_up_at);
  assert.equal(
    ok(await ngo.from("donations").select("status").eq("id", main.id).single()).status,
    "picked_up",
  );
  pass("Hotel confirms pickup; NGO sees picked-up status");
  denied(
    await hotel.rpc("complete_donation", { p_donation_id: main.id }),
    "42501",
    "Hotel cannot finish Volunteer delivery",
  );
  const completed = ok(await volunteer.rpc("complete_donation", { p_donation_id: main.id }));
  assert.equal(completed.status, "delivered");
  assert.ok(completed.delivered_at);
  const retry = ok(await volunteer.rpc("complete_donation", { p_donation_id: main.id }));
  assert.equal(retry.delivered_at, completed.delivered_at);
  for (const client of [hotel, ngo, volunteer])
    assert.equal(
      ok(await client.from("donations").select("status").eq("id", main.id).single()).status,
      "delivered",
    );
  const after = ok(await anonymous.rpc("impact_stats"));
  assert.equal(after.meals, before.meals + 1);
  pass("Volunteer finishes; all roles see delivered; impact increases once");
  denied(
    await volunteer.from("donations").update({ status: "available" }).eq("id", main.id),
    "42501",
    "Direct workflow tampering blocked",
  );
  const email = "qa-" + runId + "@foodbridge.test";
  assert.equal(
    ok(
      await anonymous.rpc("submit_contact_message", {
        p_name: "FoodBridge QA",
        p_email: email,
        p_message: "Disposable workflow test message. Reference: " + runId,
      }),
    ),
    true,
  );
  report.cleanup.contactEmail = email;
  denied(
    await anonymous.rpc("submit_contact_message", {
      p_name: "FoodBridge QA",
      p_email: email,
      p_message: "Repeated QA message should be rate limited.",
    }),
    "P0001",
    "Contact message persists and repeat submission is rate limited",
  );
  denied(
    await anonymous.from("contact_messages").select("id"),
    "42501",
    "Contact inbox is private",
  );
} catch (error) {
  report.failure = { message: error.message, code: error.code ?? null };
  process.exitCode = 1;
} finally {
  for (const id of fixtures) {
    const result = await hotel
      .from("donations")
      .delete()
      .eq("id", id)
      .eq("status", "available")
      .select("id");
    if (result.error || !result.data?.length) report.cleanup.donationIds.push(id);
  }
  await Promise.allSettled(
    [hotel, ngo, volunteer].map((client) => client.auth.signOut({ scope: "local" })),
  );
  console.log("REPORT " + JSON.stringify(report));
}
