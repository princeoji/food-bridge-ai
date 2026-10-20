import type { Donation } from "./donations";

export function deadlineLabel(bestBefore: string | null, now = Date.now()) {
  if (!bestBefore || !Number.isFinite(Date.parse(bestBefore))) return "Deadline needed";
  const minutes = Math.ceil((Date.parse(bestBefore) - now) / 60000);
  if (minutes <= 0) return "Deadline passed";
  if (minutes < 60) return minutes + " min left";
  if (minutes < 1440) return Math.ceil(minutes / 60) + " hours left";
  return Math.ceil(minutes / 1440) + " days left";
}

function csvCell(value: string | number | null) {
  let text = value == null ? "" : String(value);
  // Text from a listing must not become a formula when opened in a spreadsheet.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function donationCsv(rows: Donation[]) {
  const headers = [
    "Food",
    "Meals",
    "Status",
    "Pickup address",
    "Best before",
    "Listed at",
    "Notes",
  ];
  const records = rows.map((row) => [
    row.food_name,
    row.quantity,
    row.status,
    row.pickup_address,
    row.best_before,
    row.created_at,
    row.notes,
  ]);
  return (
    "\uFEFF" + [headers, ...records].map((record) => record.map(csvCell).join(",")).join("\r\n")
  );
}
