import { test } from "node:test";
import assert from "node:assert/strict";
import { deadlineLabel, donationCsv } from "../src/lib/dashboard.ts";

const now = Date.parse("2026-10-20T12:00:00Z");
const listing = {
  id: "test",
  donor_id: "hotel",
  claimed_by: null,
  food_name: "Fresh rice",
  quantity: 25,
  status: "available",
  pickup_address: "Reception, Main Road",
  best_before: "2026-10-20T13:00:00Z",
  created_at: "2026-10-20T11:00:00Z",
  notes: 'Contains "milk", keep chilled',
};

test("collection labels distinguish missing, expired, and upcoming deadlines", () => {
  assert.equal(deadlineLabel(null, now), "Deadline needed");
  assert.equal(deadlineLabel("invalid", now), "Deadline needed");
  assert.equal(deadlineLabel("2026-10-20T12:00:00Z", now), "Deadline passed");
  assert.equal(deadlineLabel("2026-10-20T11:00:00Z", now), "Deadline passed");
  assert.equal(deadlineLabel("2026-10-20T12:15:00Z", now), "15 min left");
  assert.equal(deadlineLabel("2026-10-20T14:00:00Z", now), "2 hours left");
  assert.equal(deadlineLabel("2026-10-22T12:00:00Z", now), "2 days left");
});

test("CSV exports preserve addresses and quoted text without private profile fields", () => {
  const csv = donationCsv([listing]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Reception, Main Road"'));
  assert.ok(csv.includes('"Contains ""milk"", keep chilled"'));
  assert.ok(csv.includes('"25"'));
  assert.ok(!csv.includes("donor_id"));
  assert.ok(!csv.includes("claimed_by"));
  assert.equal(donationCsv([]).split("\r\n").length, 1);
});

test("CSV exports neutralize spreadsheet formulas in listing text", () => {
  for (const text of [
    "=1+1",
    "+SUM(A1)",
    "-2+3",
    "@SUM(A1)",
    "  =1+1",
    "\tformula",
    "\rformula",
    "\nformula",
  ]) {
    const csv = donationCsv([{ ...listing, food_name: text, pickup_address: text, notes: text }]);
    assert.equal(
      csv.split("'" + text).length - 1,
      3,
      "Every untrusted text cell is literal: " + JSON.stringify(text),
    );
  }
});
