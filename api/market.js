import { readMarket } from "../server/market.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end(JSON.stringify({ error: "Method not allowed." }));
    return;
  }
  try {
    const data = await readMarket();
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
    );
    res.statusCode = 200;
    res.end(req.method === "HEAD" ? undefined : JSON.stringify(data));
  } catch (error) {
    console.error("Market data request failed:", error.code || error.name);
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 503;
    const message =
      error.code === "NOT_CONFIGURED"
        ? "Market data is not connected yet. The project owner needs to configure the database or enable demo mode."
        : error.code === "DATA_LIMIT"
          ? "The dataset exceeds this dashboard’s current size limit. Please narrow the configured stock universe."
          : "Market data is temporarily unavailable. Please try again shortly.";
    res.end(
      req.method === "HEAD" ? undefined : JSON.stringify({ error: message }),
    );
  }
}
