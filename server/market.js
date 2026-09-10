import { neon, neonConfig } from "@neondatabase/serverless";
import { demoData } from "./demo.js";
import stocks from "../config/stocks.json" with { type: "json" };

// A short HTTP timeout bounds failures before the Vercel function deadline.
neonConfig.fetchFunction = (url, options) =>
  fetch(url, {
    ...options,
    signal: AbortSignal.timeout(7000),
  });

export async function readMarket(env = process.env) {
  if (env.DEMO_MODE === "true") return demoData(stocks);
  if (!env.DATABASE_URL) {
    const error = new Error("Database configuration required");
    error.code = "NOT_CONFIGURED";
    throw error;
  }
  const sql = neon(env.DATABASE_URL);
  const [metadata, universe, prices, runs, monthly, summary] =
    await sql.transaction(
      [
        sql`SELECT source FROM dataset_metadata LIMIT 1`,
        sql`SELECT symbol, company_name, sector FROM stocks ORDER BY symbol`,
        sql`SELECT symbol,to_char(date,'YYYY-MM-DD') AS date,
        open_price::float,high_price::float,low_price::float,close_price::float,
        volume::float,daily_return::float,ma_7::float,ma_30::float,volatility_30::float
        FROM daily_analytics WHERE date >= CURRENT_DATE - INTERVAL '5 years'
        ORDER BY date DESC,symbol LIMIT 12001`,
        sql`SELECT status,source,started_at,finished_at FROM pipeline_runs ORDER BY started_at DESC LIMIT 10`,
        sql`SELECT symbol,to_char(month,'YYYY-MM-DD') AS month,monthly_return::float
        FROM monthly_returns ORDER BY month DESC,symbol LIMIT 1200`,
        sql`SELECT * FROM stock_summary ORDER BY symbol`,
      ],
      { readOnly: true },
    );
  if (prices.length > 12000) {
    const error = new Error("Dataset exceeds dashboard limit");
    error.code = "DATA_LIMIT";
    throw error;
  }
  return {
    source: metadata[0]?.source || "PostgreSQL",
    demo: metadata[0]?.source === "SYNTHETIC DEMO",
    stocks: universe,
    prices: prices.reverse(),
    runs,
    monthly,
    summary,
  };
}
