import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Database,
  Download,
  ExternalLink,
  Layers3,
  Moon,
  RefreshCw,
  Sun,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  compareStocks,
  compact,
  csv,
  money,
  percent,
  periodSummary,
} from "./analytics.js";

const pages = [
  ["Overview", Activity],
  ["Performance", TrendingUp],
  ["Volume", BarChart3],
  ["Data", Database],
];
const palette = ["#308cff", "#ba8cf0", "#e3a146", "#4fbda9", "#e67789"];
const shortDate = (value) =>
  new Date(value + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
function Chart({ rows, series, volume = false, comparison = false }) {
  const Container = volume ? BarChart : LineChart;
  return (
    <div
      className="chart"
      role="img"
      aria-label={
        volume
          ? "Daily trading volume chart"
          : comparison
            ? "Price return comparison chart"
            : "Closing prices and moving averages chart"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <Container
          data={rows}
          margin={{ top: 15, right: 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--line)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            minTickGap={65}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            orientation="right"
            domain={volume ? [0, "auto"] : ["auto", "auto"]}
            width={70}
            tickFormatter={(v) =>
              volume
                ? compact(v)
                : comparison
                  ? `${(v * 100).toFixed(0)}%`
                  : `$${v.toFixed(0)}`
            }
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--text)",
            }}
            labelFormatter={(d) => d}
            formatter={(v, name) => [
              volume ? compact(v) : comparison ? percent(v) : money(v),
              name,
            ]}
          />
          {series.map((s, i) =>
            volume ? (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill="var(--accent)"
                opacity={0.7}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stroke={s.color || palette[i]}
                strokeWidth={i === 0 ? 2.2 : 1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ),
          )}
          {!volume && (
            <Legend
              verticalAlign="top"
              align="left"
              height={40}
              iconType="plainline"
              wrapperStyle={{ fontSize: 13, paddingLeft: 4 }}
            />
          )}
        </Container>
      </ResponsiveContainer>
    </div>
  );
}
function Metric({ label, value, detail, tone }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={tone || ""}>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
function Empty({ children }) {
  return (
    <div className="empty">
      <AlertCircle size={24} />
      <p>{children}</p>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("data-platform-theme") || "dark";
    } catch {
      return "dark";
    }
  });
  const [page, setPage] = useState("Overview"),
    [payload, setPayload] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [selected, setSelected] = useState([]),
    [reload, setReload] = useState(0);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("data-platform-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/market", { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Unable to load market data.");
        return data;
      })
      .then((data) => {
        setPayload(data);
        const sorted = [...data.prices].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
        setSymbol((current) =>
          data.stocks.some((s) => s.symbol === current)
            ? current
            : data.stocks[0]?.symbol || "",
        );
        setSelected((current) =>
          current.length
            ? current.filter((s) => data.stocks.some((x) => x.symbol === s))
            : data.stocks.map((s) => s.symbol),
        );
        if (sorted.length) {
          setEnd((current) => current || sorted.at(-1).date);
          setStart(
            (current) =>
              current ||
              sorted[Math.max(0, sorted.length - data.stocks.length * 126)]
                .date,
          );
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);
  const prices = payload?.prices || [],
    stocks = payload?.stocks || [];
  const allDates = useMemo(
    () => [...new Set(prices.map((p) => p.date))].sort(),
    [prices],
  );
  const rows = useMemo(
    () =>
      prices
        .filter((p) => p.symbol === symbol && p.date >= start && p.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [prices, symbol, start, end],
  );
  const stats = useMemo(() => periodSummary(rows), [rows]);
  const compared = useMemo(
    () => compareStocks(prices, selected, start, end),
    [prices, selected, start, end],
  );
  const company = stocks.find((s) => s.symbol === symbol);
  const setPreset = (n) => {
    const last = allDates.at(-1);
    if (!last) return;
    setEnd(last);
    if (!n) {
      setStart(allDates[0]);
      return;
    }
    const date = new Date(last + "T00:00:00Z");
    date.setUTCMonth(date.getUTCMonth() - n);
    setStart(
      date.toISOString().slice(0, 10) < allDates[0]
        ? allDates[0]
        : date.toISOString().slice(0, 10),
    );
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([csv(rows)], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const commonMovers = compared.length
    ? selected
        .map((s) => ({
          symbol: s,
          return: compared.at(-1)[s],
          volume:
            prices.find(
              (p) => p.symbol === s && p.date === compared.at(-1).date,
            )?.volume || 0,
        }))
        .sort((a, b) => b.return - a.return)
    : [];
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <Layers3 size={25} />
          <span>
            Data<span className="brand-light">platform</span>
            <small>MARKET ANALYTICS</small>
          </span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {pages.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "nav active" : "nav"}
              onClick={() => setPage(name)}
              aria-current={page === name ? "page" : undefined}
            >
              <Icon size={18} />
              {name}
              {page === name && <span className="nav-mark" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="theme-toggle" aria-label="Color theme">
            <button
              aria-pressed={theme === "light"}
              className={theme === "light" ? "chosen" : ""}
              onClick={() => setTheme("light")}
            >
              <Sun size={15} /> Light
            </button>
            <button
              aria-pressed={theme === "dark"}
              className={theme === "dark" ? "chosen" : ""}
              onClick={() => setTheme("dark")}
            >
              <Moon size={15} /> Dark
            </button>
          </div>
          <a
            className="repo"
            href="https://github.com/Gurkamalvirk/Data-platform"
            target="_blank"
            rel="noreferrer"
          >
            View project <ExternalLink size={14} />
          </a>
          <div className="author">Built by Gurkamal Singh</div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Workspace <span>/</span> <b>{page}</b>
          </div>
          <div className="header-right">
            <span className="daily-tag">DAILY PRICES</span>
            <button
              className="icon-button"
              aria-label="Refresh data"
              title="Refresh stored data"
              disabled={loading}
              onClick={() => setReload((r) => r + 1)}
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">THE MARKET, IN PERSPECTIVE</div>
              <h1>
                {page === "Overview"
                  ? "Market overview"
                  : page === "Performance"
                    ? "Performance comparison"
                    : page === "Volume"
                      ? "Trading volume"
                      : "Explore the data"}
              </h1>
              <p>
                {page === "Overview"
                  ? "Price action and trends across your stock universe."
                  : page === "Performance"
                    ? "Compare returns from the same starting session."
                    : page === "Volume"
                      ? "Follow participation, volume shifts and peak sessions."
                      : "Inspect prices, SQL results and pipeline activity."}
              </p>
            </div>
            <button
              className="secondary export"
              disabled={!rows.length || !!error}
              onClick={download}
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
          {payload?.demo && (
            <div className="demo-banner">
              <span className="badge">DEMO DATA</span>
              <span>
                Synthetic prices for exploring the dashboard. These are not real
                market observations.
              </span>
            </div>
          )}
          {loading ? (
            <div className="loading" role="status">
              Loading market data…
            </div>
          ) : error ? (
            <Empty>
              {error}{" "}
              <button
                className="secondary"
                onClick={() => setReload((r) => r + 1)}
              >
                Try again
              </button>
            </Empty>
          ) : !prices.length ? (
            <Empty>
              No market data yet. Run the Python pipeline to populate this
              database.
            </Empty>
          ) : (
            <>
              <section className="filters" aria-label="Data filters">
                <label>
                  STOCK
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                  >
                    {stocks.map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.symbol} · {s.company_name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="dates">
                  <label>
                    FROM
                    <input
                      type="date"
                      aria-label="Start date"
                      value={start}
                      min={allDates[0]}
                      max={allDates.at(-1)}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <span className="date-dash">—</span>
                  <label>
                    TO
                    <input
                      type="date"
                      aria-label="End date"
                      value={end}
                      min={allDates[0]}
                      max={allDates.at(-1)}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                </div>
                <div className="presets" aria-label="Date presets">
                  {[
                    [1, "1M"],
                    [3, "3M"],
                    [6, "6M"],
                    [12, "1Y"],
                    [0, "ALL"],
                  ].map(([n, l]) => (
                    <button key={l} onClick={() => setPreset(n)}>
                      {l}
                    </button>
                  ))}
                </div>
              </section>
              {start > end ? (
                <Empty>The start date must be before the end date.</Empty>
              ) : page === "Performance" ? (
                <>
                  <div className="compare-controls">
                    <span>COMPARE STOCKS</span>
                    {stocks.map((s) => (
                      <label key={s.symbol}>
                        <input
                          type="checkbox"
                          checked={selected.includes(s.symbol)}
                          onChange={() =>
                            setSelected((current) =>
                              current.includes(s.symbol)
                                ? current.filter((x) => x !== s.symbol)
                                : [...current, s.symbol],
                            )
                          }
                        />
                        {s.symbol}
                      </label>
                    ))}
                  </div>
                  {!compared.length ? (
                    <Empty>
                      {selected.length
                        ? "No common trading sessions for this selection."
                        : "Select at least one stock to compare."}
                    </Empty>
                  ) : (
                    <>
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>Growth of your selected stocks</h2>
                            <p>
                              Price return · common sessions ·{" "}
                              {compared[0].date} — {compared.at(-1).date}
                            </p>
                          </div>
                          <span className="unit">BASELINE 0%</span>
                        </div>
                        <Chart
                          rows={compared}
                          comparison
                          series={selected.map((key) => ({ key, name: key }))}
                        />
                      </section>
                      <div className="metrics movers">
                        <Metric
                          label="BEST PERIOD PERFORMER"
                          value={commonMovers[0].symbol}
                          detail={percent(commonMovers[0].return)}
                          tone="positive"
                        />
                        <Metric
                          label="LOWEST PERIOD PERFORMER"
                          value={commonMovers.at(-1).symbol}
                          detail={percent(commonMovers.at(-1).return)}
                        />
                        <Metric
                          label="HIGHEST FINAL-SESSION VOLUME"
                          value={
                            [...commonMovers].sort(
                              (a, b) => b.volume - a.volume,
                            )[0].symbol
                          }
                          detail={
                            compact(
                              Math.max(...commonMovers.map((m) => m.volume)),
                            ) + " shares"
                          }
                        />
                      </div>
                    </>
                  )}
                </>
              ) : !stats ? (
                <Empty>
                  No data available for the selected stock and date range.
                </Empty>
              ) : (
                <>
                  {page === "Overview" && (
                    <>
                      <div className="metrics">
                        <Metric
                          label="LATEST SELECTED CLOSE"
                          value={money(stats.last.close_price)}
                          detail={`${symbol} · ${stats.last.date}`}
                        />
                        <Metric
                          label="DAILY CHANGE"
                          value={percent(stats.last.daily_return)}
                          tone={
                            stats.last.daily_return >= 0
                              ? "positive"
                              : "negative"
                          }
                          detail="vs. prior stored session"
                        />
                        <Metric
                          label="PERIOD PRICE RETURN"
                          value={percent(stats.return)}
                          tone={stats.return >= 0 ? "positive" : "negative"}
                          detail={`${rows.length} trading sessions`}
                        />
                        <Metric
                          label="AVERAGE VOLUME"
                          value={compact(stats.avgVolume)}
                          detail="shares per session"
                        />
                      </div>
                      <section className="panel">
                        <div className="panel-heading">
                          <div className="company">
                            <div className="ticker-icon">
                              {symbol.slice(0, 1)}
                            </div>
                            <div>
                              <h2>
                                {company?.company_name} <span>{symbol}</span>
                              </h2>
                              <p>Closing price & moving averages</p>
                            </div>
                          </div>
                          <span className="unit">USD</span>
                        </div>
                        <Chart
                          rows={rows}
                          series={[
                            { key: "close_price", name: "Closing price" },
                            {
                              key: "ma_7",
                              name: "7-session MA",
                              color: "#ba8cf0",
                            },
                            {
                              key: "ma_30",
                              name: "30-session MA",
                              color: "#e3a146",
                            },
                          ]}
                        />
                        <div className="chart-foot">
                          <span>
                            Moving averages require a complete trading-session
                            window.
                          </span>
                          <span>
                            {stats.first.date} — {stats.last.date}
                          </span>
                        </div>
                      </section>
                      <div className="bottom-grid">
                        <section className="panel details">
                          <h2>Period at a glance</h2>
                          <dl>
                            <div>
                              <dt>Highest close</dt>
                              <dd>{money(stats.high)}</dd>
                            </div>
                            <div>
                              <dt>Lowest close</dt>
                              <dd>{money(stats.low)}</dd>
                            </div>
                            <div>
                              <dt>30-session volatility</dt>
                              <dd>
                                {stats.last.volatility_30 == null
                                  ? "—"
                                  : (stats.last.volatility_30 * 100).toFixed(
                                      2,
                                    ) + "%"}
                              </dd>
                            </div>
                          </dl>
                        </section>
                        <section className="panel details">
                          <h2>
                            About these metrics <ArrowUpRight size={17} />
                          </h2>
                          <p>
                            Returns measure closing-price changes and exclude
                            dividends. Volatility is the unannualized sample
                            standard deviation of 30 daily returns.
                          </p>
                          <p>
                            All figures use stored daily observations, not
                            real-time quotes.
                          </p>
                        </section>
                      </div>
                    </>
                  )}
                  {page === "Volume" && (
                    <>
                      <div className="metrics">
                        <Metric
                          label="AVERAGE VOLUME"
                          value={compact(stats.avgVolume)}
                          detail="shares per session"
                        />
                        <Metric
                          label="PEAK VOLUME"
                          value={compact(stats.peak.volume)}
                          detail={stats.peak.date}
                        />
                        <Metric
                          label="LATEST SELECTED SESSION"
                          value={compact(stats.last.volume)}
                          detail={stats.last.date}
                        />
                      </div>
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>{symbol} trading activity</h2>
                            <p>Daily share volume</p>
                          </div>
                          <span className="unit">SHARES</span>
                        </div>
                        <Chart
                          rows={rows}
                          volume
                          series={[{ key: "volume", name: "Volume" }]}
                        />
                      </section>
                    </>
                  )}
                  {page === "Data" && (
                    <>
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>{symbol} daily observations</h2>
                            <p>
                              {rows.length} records · showing latest 100 ·
                              export includes the full selection
                            </p>
                          </div>
                          <span className="unit">OHLCV</span>
                        </div>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                {[
                                  "Date",
                                  "Open",
                                  "High",
                                  "Low",
                                  "Close",
                                  "Volume",
                                  "Change",
                                ].map((c) => (
                                  <th key={c}>{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows
                                .slice(-100)
                                .reverse()
                                .map((r) => (
                                  <tr key={r.date}>
                                    <td>{r.date}</td>
                                    <td>{money(r.open_price)}</td>
                                    <td>{money(r.high_price)}</td>
                                    <td>{money(r.low_price)}</td>
                                    <td>{money(r.close_price)}</td>
                                    <td>{compact(r.volume)}</td>
                                    <td
                                      className={
                                        r.daily_return >= 0
                                          ? "positive"
                                          : "negative"
                                      }
                                    >
                                      {percent(r.daily_return)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                      <section className="panel details">
                        <h2>Pipeline activity</h2>
                        {!payload.runs.length ? (
                          <p>
                            {payload.demo
                              ? "This demo is generated. No ingestion runs have been recorded."
                              : "No ingestion runs recorded yet."}
                          </p>
                        ) : (
                          <div className="table-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th>Started</th>
                                  <th>Source</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payload.runs.map((r, i) => (
                                  <tr key={i}>
                                    <td>
                                      {new Date(r.started_at).toLocaleString()}
                                    </td>
                                    <td>{r.source}</td>
                                    <td>{r.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                      {!!payload.monthly.length && (
                        <section className="panel details">
                          <h2>Monthly SQL returns</h2>
                          <p>
                            First month is blank; the current month may be
                            incomplete.
                          </p>
                          <div className="table-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th>Month</th>
                                  <th>Return</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payload.monthly
                                  .filter((r) => r.symbol === symbol)
                                  .map((r) => (
                                    <tr key={r.month}>
                                      <td>{r.month.slice(0, 7)}</td>
                                      <td>{percent(r.monthly_return)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </>
              )}
              <footer>
                <span>
                  {payload.demo ? "Synthetic demo" : payload.source} · Last
                  stored session {allDates.at(-1)}
                </span>
                <span>
                  Daily frequency <span className="footer-separator">/</span>{" "}
                  USD
                </span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
