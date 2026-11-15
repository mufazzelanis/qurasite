/** Date ranges in Bangladesh time (UTC+6). */
const OFF = 6 * 3600_000;
const DAY = 86400_000;

/** start of BD day (as UTC Date) for a given instant */
export function bdStartOfDay(d: Date) {
  const x = new Date(d.getTime() + OFF);
  x.setUTCHours(0, 0, 0, 0);
  return new Date(x.getTime() - OFF);
}
/** "2026-11-14" (BD calendar date) → UTC instant of its start */
export function bdDate(s: string) {
  return new Date(new Date(s + "T00:00:00Z").getTime() - OFF);
}
export function bdDateString(d: Date) {
  return new Date(d.getTime() + OFF).toISOString().slice(0, 10);
}
export function bdHour(d: Date) {
  return new Date(d.getTime() + OFF).getUTCHours();
}

export const PERIODS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["week", "This week"],
  ["lastweek", "Last week"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
  ["year", "This year"],
  ["lastyear", "Last year"],
  ["all", "All time"],
] as const;

export type Range = { from: Date; to: Date; prevFrom: Date; prevTo: Date; label: string; key: string };

export function getRange(key = "month", fromStr?: string, toStr?: string): Range {
  const now = new Date();
  const today = bdStartOfDay(now);
  const bd = new Date(now.getTime() + OFF); // BD calendar fields via UTC getters
  let from: Date;
  let to: Date = now;
  let label = "";

  const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1) - OFF);
  const y = bd.getUTCFullYear();
  const m = bd.getUTCMonth();
  // week starts Saturday in Bangladesh
  const dow = (bd.getUTCDay() + 1) % 7; // Sat=0
  const weekStart = new Date(today.getTime() - dow * DAY);

  switch (key) {
    case "custom":
      from = fromStr ? bdDate(fromStr) : today;
      to = toStr ? new Date(bdDate(toStr).getTime() + DAY - 1) : now;
      break;
    case "today":
      from = today;
      break;
    case "yesterday":
      from = new Date(today.getTime() - DAY);
      to = new Date(today.getTime() - 1);
      break;
    case "week":
      from = weekStart;
      break;
    case "lastweek":
      from = new Date(weekStart.getTime() - 7 * DAY);
      to = new Date(weekStart.getTime() - 1);
      break;
    case "lastmonth":
      from = monthStart(y, m - 1);
      to = new Date(monthStart(y, m).getTime() - 1);
      break;
    case "year":
      from = monthStart(y, 0);
      break;
    case "lastyear":
      from = monthStart(y - 1, 0);
      to = new Date(monthStart(y, 0).getTime() - 1);
      break;
    case "all":
      from = new Date("2020-01-01T00:00:00Z");
      break;
    default:
      key = "month";
      from = monthStart(y, m);
  }
  const len = to.getTime() - from.getTime();
  // compare with "same days" of the previous period
  let prevFrom: Date, prevTo: Date;
  if (key === "month" || key === "lastmonth") {
    const pm = key === "month" ? m - 1 : m - 2;
    prevFrom = monthStart(y, pm);
    prevTo = new Date(prevFrom.getTime() + len);
  } else if (key === "year" || key === "lastyear") {
    prevFrom = monthStart(key === "year" ? y - 1 : y - 2, 0);
    prevTo = new Date(prevFrom.getTime() + len);
  } else {
    prevTo = new Date(from.getTime() - 1);
    prevFrom = new Date(prevTo.getTime() - len);
  }
  const fmt = (d: Date) => new Date(d.getTime() + OFF).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  label = `${fmt(from)} – ${fmt(to)}`;
  return { from, to, prevFrom, prevTo, label, key };
}

export function pctChange(cur: number, prev: number) {
  if (!prev) return cur ? null : 0; // null = "new"
  return Math.round(((cur - prev) / prev) * 100);
}
