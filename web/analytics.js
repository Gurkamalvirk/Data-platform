export const percent = (value) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
export const money = (value) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
export const compact = (value) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export function periodSummary(rows) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0],
    last = sorted.at(-1);
  return {
    first,
    last,
    return: last.close_price / first.close_price - 1,
    avgVolume: sorted.reduce((sum, row) => sum + row.volume, 0) / sorted.length,
    high: Math.max(...sorted.map((r) => r.close_price)),
    low: Math.min(...sorted.map((r) => r.close_price)),
    peak: sorted.reduce((a, b) => (a.volume > b.volume ? a : b)),
  };
}
export function compareStocks(prices, symbols, start, end) {
  if (!symbols.length) return [];
  const byDate = new Map();
  for (const p of prices) {
    if (p.date < start || p.date > end || !symbols.includes(p.symbol)) continue;
    if (!byDate.has(p.date)) byDate.set(p.date, {});
    byDate.get(p.date)[p.symbol] = p.close_price;
  }
  const common = [...byDate.entries()]
    .filter(([, p]) => symbols.every((s) => p[s] != null))
    .sort(([a], [b]) => a.localeCompare(b));
  if (!common.length) return [];
  const base = common[0][1];
  return common.map(([date, p]) =>
    Object.fromEntries([
      ["date", date],
      ...symbols.map((s) => [s, p[s] / base[s] - 1]),
    ]),
  );
}
export function csv(rows) {
  const columns = [
    "date",
    "symbol",
    "open_price",
    "high_price",
    "low_price",
    "close_price",
    "volume",
    "daily_return",
    "ma_7",
    "ma_30",
  ];
  return [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => r[c] ?? "").join(",")),
  ].join("\n");
}
