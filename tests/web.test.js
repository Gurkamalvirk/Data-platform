import test from "node:test";
import assert from "node:assert/strict";
import { compareStocks, periodSummary, csv } from "../web/analytics.js";
import { demoData } from "../server/demo.js";
import { readMarket } from "../server/market.js";
import handler from "../api/market.js";

const p = (symbol, date, close) => ({
  symbol,
  date,
  close_price: close,
  volume: 100,
});
test("comparison rebases on shared dates and ignores non-common sessions", () => {
  const rows = [
    p("A", "2024-01-01", 1),
    p("A", "2024-01-02", 10),
    p("B", "2024-01-02", 20),
    p("A", "2024-01-03", 11),
    p("B", "2024-01-03", 18),
  ];
  const result = compareStocks(rows, ["A", "B"], "2024-01-01", "2024-01-03");
  assert.equal(result.length, 2);
  assert.equal(result[0].A, 0);
  assert.equal(result[0].B, 0);
  assert.ok(Math.abs(result[1].A - 0.1) < 1e-10);
  assert.ok(Math.abs(result[1].B + 0.1) < 1e-10);
});
test("empty selections and no overlapping dates are empty", () => {
  assert.deepEqual(compareStocks([], [], "2024-01-01", "2024-01-02"), []);
  assert.deepEqual(
    compareStocks(
      [p("A", "2024-01-01", 1), p("B", "2024-01-02", 2)],
      ["A", "B"],
      "2024-01-01",
      "2024-01-02",
    ),
    [],
  );
  assert.equal(periodSummary([]), null);
});
test("period return orders observations and CSV includes all rows", () => {
  const rows = [p("A", "2024-01-02", 120), p("A", "2024-01-01", 100)];
  assert.ok(Math.abs(periodSummary(rows).return - 0.2) < 1e-10);
  assert.equal(csv(rows).split("\n").length, 3);
});
test("demo is deterministic, labelled and has full-window moving averages", () => {
  const data = demoData([{ symbol: "A", company_name: "A", sector: "Test" }]);
  assert.equal(data.demo, true);
  assert.equal(data.source, "SYNTHETIC DEMO");
  assert.deepEqual(
    data,
    demoData([{ symbol: "A", company_name: "A", sector: "Test" }]),
  );
  assert.equal(data.prices[5].ma_7, null);
  const mean =
    data.prices.slice(0, 7).reduce((s, p) => s + p.close_price, 0) / 7;
  assert.equal(data.prices[6].ma_7, mean);
  assert.equal(data.prices[29].volatility_30, null);
  assert.ok(data.prices[30].volatility_30 > 0);
});
test("missing database cannot silently fall back to synthetic data", async () => {
  await assert.rejects(
    () => readMarket({}),
    (e) => e.code === "NOT_CONFIGURED",
  );
  const data = await readMarket({ DEMO_MODE: "true" });
  assert.equal(data.demo, true);
});
test("API rejects writes before querying the database", async () => {
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(value) {
      this.body = value;
    },
  };
  await handler({ method: "POST" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "GET, HEAD");
});
