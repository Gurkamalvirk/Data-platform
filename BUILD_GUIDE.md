# Progressive build guide

This edition includes the approved React/Vercel dashboard and the retained local Streamlit version. Extract or clone the full repository before running commands. The complete authored source is shown below; package-lock.json in the repository pins JavaScript dependencies. See README.md and docs/NEON_SETUP.md for exact commands and expected output at each setup stage.

Checks: `npm ci`, `npm test` (6 tests), `npm run build` (production output in dist), and `python -m pytest -q` (18 pass; 2 database tests skipped until RUN_DB_TESTS=1).

## Step 1 — Architecture and cost

### README.md

Location: repository root / `README.md`.

`````
# Data Platform — Stock Market Analytics

A portfolio-ready stock analytics project with a **React dashboard for Vercel**, a **Python ingestion pipeline**, **PostgreSQL SQL analytics**, and the original **Streamlit dashboard for local use**.

> Designed to run at ₹0 / $0 using Vercel Hobby for personal use, Neon Free PostgreSQL, and standard GitHub Actions runners in this public repository. No credit card or paid plan is required. Stay on the free plans and within their quotas; no paid fallback is configured.

## Architecture

```mermaid
flowchart TD
    A[Yahoo Finance via yfinance] --> B[Python ETL]
    C[Daily GitHub Actions or local schedule] --> B
    B --> D[Raw and rejected CSVs]
    B --> E[PostgreSQL: Neon or local Docker]
    E --> F[SQL analytics views]
    F --> G[Vercel read-only API]
    G --> H[React dashboard]
    F --> I[Local Streamlit dashboard]
```

## What is included

- Four React views: Overview, Performance, Volume and Data.
- A visible, persistent **Light / Dark** switch; mobile layout; interactive Recharts charts.
- Shared-date stock comparisons, OHLCV inspection and complete-selection CSV export.
- SQL moving averages, daily returns, volatility, monthly returns and all-history summaries.
- PostgreSQL constraints and idempotent upserts; seven-day overlap and weekly full refresh.
- Raw and rejected-record audit files; per-symbol failure isolation and pipeline run history.
- Explicit synthetic demo mode, with a visible warning. No silent fallback on database errors.
- Daily scheduled ingestion at **03:00 UTC / 08:30 IST**, plus manual runs.
- Python and JavaScript tests. The local Docker/Streamlit version remains available.

## Start the React demo locally

Install Node.js 22 or 24, then from this directory:

```bash
npm ci
```

PowerShell:

```powershell
$env:DEMO_MODE="true"
npm run dev
```

Linux/macOS:

```bash
DEMO_MODE=true npm run dev
```

Open the address Vite prints. Demo prices are synthetic fixtures, not market observations. The demo contains fixed historical business-day dates and is not presented as a current feed. No API key, Python environment or database is needed to explore this explicitly enabled demo.

```bash
npm test
npm run build
```

## Deploy on Vercel

Import **Gurkamalvirk/Data-platform** from GitHub. Set:

| Setting | Value |
|---|---|
| Framework | Vite |
| Root directory | Repository root (leave blank) |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 22.x or 24.x |
| Initial environment variable | `DEMO_MODE=true` |

The `api/market.js` endpoint becomes a Vercel Node function automatically. Python ingestion and Docker are not started inside Vercel. **Do not use a Streamlit start command on Vercel.** Keep the project on Hobby for this personal portfolio.

For the real database-backed version, follow **[Neon setup](docs/NEON_SETUP.md)**. Set server-side `DATABASE_URL` and `DEMO_MODE=false` in Vercel, then redeploy. Never use a `VITE_` prefix for a secret: Vite exposes those values to the browser.

## Database setup and daily updates

1. Create a **Neon Free** project. No credit card is needed.
2. Copy its **direct connection URL** with connection pooling disabled; retain `sslmode=require`.
3. Store the URL as `DATABASE_URL` in your local `.env`, Vercel Environment Variables, and this repository's Actions secrets. Instructions and placeholders are in [NEON_SETUP.md](docs/NEON_SETUP.md).
4. Initialize and ingest locally, or use **Actions → Daily market ingestion → Run workflow**. The workflow initializes tables/views automatically before fetching data.
5. After successful ingestion, turn off demo mode on Vercel and redeploy.

The workflow does nothing except report missing configuration until the secret exists. It uses standard `ubuntu-latest` runners, has a ten-minute timeout, and does not upload downloaded market data as public artifacts. GitHub schedules are best-effort; they may run late and can be disabled after prolonged repository inactivity. Check the Actions tab. Public-repository standard runners are free; review billing rules before changing repository visibility or runner type.

Neon Free can suspend at its quota and scale to zero when idle; first access may be slower. The API uses read-only transactions, a seven-second request timeout, and a five-minute shared response cache. It returns at most five years / 12,000 daily observations and fails explicitly if the row cap is exceeded. Daily snapshots do not need high-frequency polling. Keep the initial five-stock universe for the free demonstration.

## Source and data meaning

The stock universe is defined **once** in `config/stocks.json`; both the Python pipeline and hosted demo read it. Pipeline dates, overlap and pacing live in `config/pipeline.json`.

Live data uses Yahoo's public HTTP APIs through the unofficial `yfinance` wrapper, with no API key. Yahoo access is intended for personal use and is not a guaranteed service; rate limits or timeouts can prevent ingestion. There is no automatic paid source or fabricated fallback. The Python pipeline retries serially and continues other stocks after a failure. Review source terms before making downloaded market data publicly available; the deployed demo does not redistribute actual Yahoo observations.

Prices use `auto_adjust=False`, as supplied by the provider. Price returns exclude dividends. SQL MA windows use 7 and 30 trading observations; volatility is the sample standard deviation of 30 daily returns, not annualized. The API reads SQL windows computed before filtering. The browser performs simple selected-period ratios and common-date rebasing for interactive filters. Monthly returns use consecutive month-end available closes; the current month can be incomplete.

## Project map

| Path | Responsibility |
|---|---|
| `web/` | React application, styles, charts and interactive selection calculations |
| `api/market.js` | GET/HEAD-only Vercel endpoint; no public write or ingestion route |
| `server/market.js` | Neon HTTP queries in a read-only transaction |
| `server/demo.js` | Explicit deterministic synthetic dataset |
| `src/` | Original modular Python ingestion, transformation, database and analytics code |
| `sql/` | PostgreSQL schema, views and example queries |
| `config/` | Shared stock universe and Python pipeline settings |
| `dashboard/` | Original local Streamlit dashboard |
| `.github/workflows/ingest.yml` | Daily/manual Python ingestion into Neon |
| `tests/` | Python validation/database tests and JavaScript analytics/API tests |
| `docs/LOCAL_SETUP.md` | Original local Docker and Streamlit workflow |
| `docs/NEON_SETUP.md` | Exact environment-variable and hosted setup instructions |
| `BUILD_GUIDE.md` | Progressive build guide with complete project source |
| `VALIDATION.md` | What was tested and what still requires external configuration |

## Test commands

```bash
npm ci
npm test
npm run build
python -m pip install -r requirements.txt
python -m pytest -q
```

PostgreSQL integration tests are opt-in. Set `RUN_DB_TESTS=1` and run pytest with a configured local/direct database URL. They use a unique rollback schema and do not insert fixtures into application tables. The role must be allowed to create schemas.

## Secrets

**Never commit `.env`.** Copy `.env.example` into `.env` for local use and replace placeholders there. For hosted use, secrets belong in Vercel Environment Variables and GitHub Actions secrets, not source files. `.gitignore` excludes local secrets and runtime data. `python main.py --check-config` confirms that credentials are configured without printing them.

## Local version

See [LOCAL_SETUP.md](docs/LOCAL_SETUP.md) for Docker Compose, PowerShell commands and Streamlit. Local PostgreSQL uses the `POSTGRES_*` variables; hosted PostgreSQL uses `DATABASE_URL`, which takes precedence. Streamlit and React can read the same Neon database. The API used by the React version expects Neon; use Streamlit with the local Docker database.

## Future improvements

Airflow, Spark, Kafka, real-time ingestion and a cloud data warehouse remain intentionally unimplemented. The five-stock daily workload does not justify them. Future work could add exchange calendars, pagination for larger stock universes, source licensing appropriate for a public live-data service, and stronger cross-provider data checks.

## References

- [Vercel Vite documentation](https://vercel.com/docs/frameworks/frontend/vite)
- [Neon Free pricing](https://neon.com/pricing)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [yfinance documentation and data terms](https://ranaroussi.github.io/yfinance/)

`````

## Step 2 — Environment setup

### .env.example

Location: repository root / `.env.example`.

`````
# Choose a local password; no online account or API key is needed.
POSTGRES_USER=stock_user
POSTGRES_PASSWORD=replace_with_your_local_password
POSTGRES_DB=stocks
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Hosted mode: paste your Neon direct connection string (pooling off) here (server-side only).
# DATABASE_URL=postgresql://USER:PASSWORD@YOUR-ENDPOINT.neon.tech/neondb?sslmode=require
# Explicit demo mode for React; set false when Neon is configured.
DEMO_MODE=true

`````

### src/settings.py

Location: repository root / `src/settings.py`.

`````
"""Project paths and validated configuration; never print credentials."""
import os
import re
from datetime import date
from pathlib import Path

import json
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]


def configuration() -> dict:
    with (ROOT / "config/pipeline.json").open() as handle:
        config = json.load(handle)
    config["stocks"] = json.loads((ROOT / "config/stocks.json").read_text())
    date.fromisoformat(str(config["start_date"]))
    symbols = [s["symbol"] for s in config["stocks"]]
    if not symbols or len(symbols) != len(set(symbols)):
        raise ValueError("Configure at least one stock, without duplicate symbols.")
    if any(not re.fullmatch(r"[A-Z0-9.^=-]{1,20}", s) for s in symbols):
        raise ValueError("Invalid stock symbol in configuration.")
    if int(config["overlap_days"]) < 1 or float(config["request_pause_seconds"]) < 1:
        raise ValueError("Overlap and request pause must be positive.")
    return config


def database_options() -> dict:
    load_dotenv(ROOT / ".env", override=False)
    url = os.getenv("DATABASE_URL", "")
    if url:
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(url)
        if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname:
            raise ValueError("DATABASE_URL must be a PostgreSQL connection string.")
        if "-pooler." in parsed.hostname:
            raise ValueError("Use a direct Neon URL (connection pooling off) for pipeline session locks.")
        if parsed.hostname not in {"localhost", "127.0.0.1"} and parse_qs(parsed.query).get("sslmode", [""])[0] not in {"require", "verify-full", "verify-ca"}:
            raise ValueError("Remote DATABASE_URL must require TLS.")
        return dict(conninfo=url, connect_timeout=10)
    password = os.getenv("POSTGRES_PASSWORD", "")
    if not password or password == "replace_with_your_local_password":
        raise ValueError("Set POSTGRES_PASSWORD in .env using the README instructions.")
    return dict(host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                dbname=os.getenv("POSTGRES_DB", "stocks"),
                user=os.getenv("POSTGRES_USER", "stock_user"),
                password=password, connect_timeout=10)

`````

### docs/NEON_SETUP.md

Location: repository root / `docs/NEON_SETUP.md`.

`````
# Connect Neon PostgreSQL without sharing secrets

## 1. Create the free database

Visit https://neon.com and sign up. Create a project named `data-platform` on the **Free** plan. Keep the default PostgreSQL database (`neondb`) and role, or choose your own. You do not need to provide a credit card or activate a paid trial.

Open the project's **Connect** dialog. Select your database and role, and turn **Connection pooling OFF**. Copy the PostgreSQL connection string. Keep its `sslmode=require` parameter (and `channel_binding=require` if present).

Why a direct URL: the Python loader uses a PostgreSQL session advisory lock to prevent overlapping jobs while committing each stock separately. A transaction-pooled connection cannot preserve that session lock across commits. The Neon HTTP API also accepts this direct URL, so one URL can serve both paths.

## 2. Configure your local .env

From the project root, copy `.env.example` to `.env`. PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Add your copied URL using this format; the values here are **placeholders only**:

```dotenv
DATABASE_URL=postgresql://YOUR_ROLE:YOUR_PASSWORD@YOUR_DIRECT_ENDPOINT.neon.tech/neondb?sslmode=require
DEMO_MODE=false
```

The endpoint must not contain `-pooler`. Paste the provider's URL exactly; passwords with special characters must remain URL-encoded as supplied by Neon. Quotes are not required for a normal Neon URL. Leave `.env` at the project root. You can retain the local `POSTGRES_*` variables; `DATABASE_URL` takes precedence.

`DATABASE_URL` authenticates the server and ingestion process to PostgreSQL. `DEMO_MODE` is not a secret: `true` explicitly selects synthetic data in the React API, and `false` selects the database. Python ingestion uses `--demo` only when explicitly requested and does not read `DEMO_MODE`.

Never commit `.env` to GitHub, put credentials into source files, or paste them into chat. `git check-ignore .env` should print `.env`. Never name this variable `VITE_DATABASE_URL`: `VITE_*` variables are public client build variables.

## 3. Verify without displaying the password

Create a Python environment and install the pipeline dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-pipeline.txt
.\.venv\Scripts\python.exe main.py --check-config
.\.venv\Scripts\python.exe main.py --init-db
.\.venv\Scripts\python.exe main.py
```

Expected: configuration loaded (password hidden), database schema ready, and one retrieval/upsert result per configured stock. Provider failures are logged; a partial/failed run returns exit code 1. A successful connection does not guarantee Yahoo access from your network.

Alternatively, use the GitHub workflow in step 5 to initialize and ingest; no local Python installation is then necessary.

## 4. Configure Vercel

Open your **data-platform** project → **Settings → Environment Variables**:

| Name | Value | Environments |
|---|---|---|
| `DATABASE_URL` | Your direct Neon connection URL | Production and Preview |
| `DEMO_MODE` | `false` | Production and Preview |

Save, then **Deployments → latest deployment → Redeploy**. Use Vercel's secret/sensitive setting for `DATABASE_URL` where available. Never send the URL to visitors or expose it through client-side environment variables.

If ingestion has not populated tables yet, finish step 3 or 5 first. Check the Data view for pipeline runs and actual stored prices. The synthetic banner should disappear only when the database contains real data. If the database contains an explicitly loaded Python demo, the banner correctly remains.

To explore the site before creating Neon, configure only `DEMO_MODE=true` and redeploy. This is an explicit demo configuration, not a silent fallback. For a live configuration, a missing/broken database displays a friendly error.

## 5. Enable free daily ingestion

In GitHub open **Gurkamalvirk/Data-platform → Settings → Secrets and variables → Actions → New repository secret**:

- Name: `DATABASE_URL`
- Secret: the same direct Neon URL.

Then open **Actions → Daily market ingestion → Run workflow** on `main`.

After success, future daily runs use the secret at 03:00 UTC (08:30 IST). Sunday runs refresh full history to catch older provider corrections. Standard hosted runners on this public repository are free. Keep the runner standard and the repository public to retain that billing model. No raw data artifacts are uploaded.

If the job fails, look at which phase failed: configuration, connection, or provider retrieval. Do not paste your secret into logs. The workflow skips with a visible configuration message while no secret is set. Scheduled workflows can be delayed or disabled after prolonged repository inactivity; the Actions tab shows their state.

## 6. Stay at ₹0

Keep Vercel on Hobby (personal use), Neon on Free, and standard GitHub Actions runners in the public repository. Do not enable paid add-ons or upgrade plans. The API caches responses for five minutes and bounds its dataset size, but free-tier quotas still apply; services may pause when exhausted. Read provider dashboards for current quota usage. There is no automatic paid fallback.

`````

## Step 3 — Shared configuration

### config/stocks.json

Location: repository root / `config/stocks.json`.

`````
[
  {
    "symbol": "AAPL",
    "company_name": "Apple",
    "sector": "Technology"
  },
  {
    "symbol": "MSFT",
    "company_name": "Microsoft",
    "sector": "Technology"
  },
  {
    "symbol": "GOOGL",
    "company_name": "Alphabet",
    "sector": "Communication Services"
  },
  {
    "symbol": "AMZN",
    "company_name": "Amazon",
    "sector": "Consumer Discretionary"
  },
  {
    "symbol": "NVDA",
    "company_name": "NVIDIA",
    "sector": "Technology"
  }
]

`````

### config/pipeline.json

Location: repository root / `config/pipeline.json`.

`````
{
  "start_date": "2024-01-01",
  "overlap_days": 7,
  "request_pause_seconds": 2
}

`````

### package.json

Location: repository root / `package.json`.

`````
{
  "name": "data-platform",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "node --test tests/web.test.js"
  },
  "engines": {
    "node": ">=22"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.0.2",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "recharts": "^3.1.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "vite": "^7.1.0",
    "@vitejs/plugin-react": "^5.0.0"
  }
}

`````

### requirements.txt

Location: repository root / `requirements.txt`.

`````
pandas>=2.2,<3
numpy>=1.26,<3
psycopg[binary]>=3.2,<4
python-dotenv>=1.0,<2
PyYAML>=6,<7
yfinance>=0.2.65,<2
streamlit>=1.55,<2
plotly>=6,<7
pytest>=8,<10

`````

### requirements-pipeline.txt

Location: repository root / `requirements-pipeline.txt`.

`````
pandas>=2.2,<3
numpy>=1.26,<3
psycopg[binary]>=3.2,<4
python-dotenv>=1.0,<2
yfinance>=0.2.65,<2

`````

## Step 4 — Database

### sql/schema.sql

Location: repository root / `sql/schema.sql`.

`````
CREATE TABLE IF NOT EXISTS stocks (
    stock_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    sector TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS daily_prices (
    price_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_id BIGINT NOT NULL REFERENCES stocks(stock_id),
    date DATE NOT NULL,
    open_price NUMERIC(20,6) NOT NULL CHECK (open_price > 0),
    high_price NUMERIC(20,6) NOT NULL CHECK (high_price > 0),
    low_price NUMERIC(20,6) NOT NULL CHECK (low_price > 0),
    close_price NUMERIC(20,6) NOT NULL CHECK (close_price > 0),
    volume BIGINT NOT NULL CHECK (volume >= 0),
    UNIQUE (stock_id, date),
    CHECK (high_price >= GREATEST(open_price, close_price, low_price)),
    CHECK (low_price <= LEAST(open_price, close_price))
);
CREATE INDEX IF NOT EXISTS idx_prices_date ON daily_prices(date);
CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id TEXT PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    source TEXT NOT NULL
);
-- Prevent accidental mixing of synthetic and actual observations.
CREATE TABLE IF NOT EXISTS dataset_metadata (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    source TEXT NOT NULL
);

`````

### src/database/connection.py

Location: repository root / `src/database/connection.py`.

`````
import psycopg
from src.settings import ROOT, database_options


def connect():
    return psycopg.connect(**database_options())


def initialize(conn) -> None:
    for filename in ("schema.sql", "views.sql"):
        conn.execute((ROOT / "sql" / filename).read_text())
    conn.commit()

`````

## Step 5 — Ingestion

### src/ingestion/fetch_stocks.py

Location: repository root / `src/ingestion/fetch_stocks.py`.

`````
"""Serial, bounded retrieval from Yahoo's public HTTP API via yfinance."""
import logging
import time
from datetime import date

import pandas as pd
import yfinance as yf

LOG = logging.getLogger(__name__)


def fetch_stock(symbol: str, start: date, end: date, destination) -> pd.DataFrame:
    # yfinance handles HTTP response decoding and Yahoo session cookies.
    for attempt in range(3):
        try:
            frame = yf.Ticker(symbol).history(
                start=start.isoformat(), end=end.isoformat(), interval="1d",
                auto_adjust=False, actions=False, raise_errors=True, timeout=20,
            )
            if frame.empty:
                raise ValueError("No data returned by provider")
            frame = frame.reset_index()
            # Preserve exchange-local session dates, not UTC-converted instants.
            frame["Date"] = frame["Date"].dt.strftime("%Y-%m-%d")
            frame.to_csv(destination, index=False)
            LOG.info("%s retrieved %d records", symbol, len(frame))
            return frame
        except Exception as exc:
            LOG.warning("%s request attempt %d failed (%s)", symbol, attempt + 1,
                        type(exc).__name__)
            if attempt == 2:
                raise RuntimeError("Provider request failed after three attempts") from exc
            time.sleep(5 * 2**attempt)
    raise RuntimeError("Unreachable")

`````

### src/ingestion/demo.py

Location: repository root / `src/ingestion/demo.py`.

`````
"""Deterministic synthetic fixtures; never presented as market observations."""
import hashlib

import numpy as np
import pandas as pd


def demo_prices(symbol, start, end):
    rng = np.random.default_rng(int(hashlib.sha256(symbol.encode()).hexdigest()[:8], 16))
    dates = pd.bdate_range("2024-01-01", end, inclusive="left")
    close = 100 * np.exp(np.cumsum(rng.normal(0.0003, 0.012, len(dates))))
    opening = close * rng.uniform(0.994, 1.006, len(dates))
    frame = pd.DataFrame({"Date": dates.strftime("%Y-%m-%d"), "Open": opening,
                          "High": np.maximum(opening, close) * 1.01,
                          "Low": np.minimum(opening, close) * 0.99, "Close": close,
                          "Volume": rng.integers(1000000, 5000000, len(dates))})
    return frame.loc[frame.Date >= str(start)].reset_index(drop=True)

`````

## Step 6 — Transformation

### src/transformation/transform.py

Location: repository root / `src/transformation/transform.py`.

`````
"""Normalize OHLCV and return every rejected row with a reason."""
import logging

import numpy as np
import pandas as pd

LOG = logging.getLogger(__name__)
COLUMNS = ["date", "symbol", "open_price", "high_price", "low_price", "close_price", "volume"]


def transform(raw: pd.DataFrame, symbol: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    frame = raw.copy()
    frame.columns = [str(c).strip().lower().replace(" ", "_") for c in frame.columns]
    frame = frame.rename(columns={n: n + "_price" for n in ("open", "high", "low", "close")})
    required = set(COLUMNS) - {"symbol"}
    if not required.issubset(frame.columns):
        raise ValueError("Source response is missing OHLCV/date columns.")
    original = frame.copy()
    parsed = pd.to_datetime(frame["date"], errors="coerce", utc=True)
    frame["date"] = parsed.dt.date
    frame["symbol"] = symbol
    numeric = COLUMNS[2:]
    for col in numeric:
        frame[col] = pd.to_numeric(frame[col], errors="coerce")
    reason = pd.Series("", index=frame.index)

    def reject(mask, label):
        reason.loc[mask.fillna(True)] += label + "; "

    reject(parsed.isna(), "invalid date")
    reject(parsed >= pd.Timestamp.now(tz="UTC").normalize(), "current/future session excluded")
    reject(~np.isfinite(frame[numeric]).all(axis=1), "missing/non-finite number")
    reject((frame[numeric[:-1]] <= 0).any(axis=1), "non-positive price")
    reject((frame.volume < 0) | (frame.volume % 1 != 0) |
           (frame.volume >= 2**63), "invalid volume")
    reject((frame.high_price < frame[["low_price", "open_price", "close_price"]].max(axis=1)) |
           (frame.low_price > frame[["open_price", "close_price"]].min(axis=1)), "invalid OHLC range")
    valid = frame.loc[reason == "", COLUMNS].copy()
    duplicates = valid.duplicated(["symbol", "date"], keep="last")
    reason.loc[valid.index[duplicates]] = "duplicate symbol/date; "
    valid = valid.loc[~duplicates].sort_values("date")
    valid["volume"] = valid["volume"].astype("int64")
    rejected = original.loc[reason != ""].copy()
    rejected["reason"] = reason.loc[reason != ""]
    if len(rejected):
        LOG.warning("%s rejected %d rows: %s", symbol, len(rejected),
                    rejected.reason.value_counts().to_dict())
    return valid.reset_index(drop=True), rejected

`````

## Step 7 — Incremental loading

### src/database/load_data.py

Location: repository root / `src/database/load_data.py`.

`````
"""Atomic per-symbol upserts protected by a database unique constraint."""


def latest_date(conn, symbol):
    return conn.execute(
        "SELECT MAX(date) FROM daily_prices JOIN stocks USING(stock_id) WHERE symbol=%s",
        (symbol,),
    ).fetchone()[0]


def load_prices(conn, stock: dict, frame) -> int:
    with conn.transaction():
        stock_id = conn.execute(
            """INSERT INTO stocks(symbol,company_name,sector) VALUES (%s,%s,%s)
            ON CONFLICT(symbol) DO UPDATE SET company_name=EXCLUDED.company_name,
            sector=EXCLUDED.sector RETURNING stock_id""",
            (stock["symbol"], stock["company_name"], stock["sector"]),
        ).fetchone()[0]
        rows = [(stock_id, row.date, float(row.open_price), float(row.high_price),
                 float(row.low_price), float(row.close_price), int(row.volume))
                for row in frame.itertuples(index=False)]
        with conn.cursor() as cursor:
            cursor.executemany(
                """INSERT INTO daily_prices(stock_id,date,open_price,high_price,
                low_price,close_price,volume) VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(stock_id,date) DO UPDATE SET
                open_price=EXCLUDED.open_price, high_price=EXCLUDED.high_price,
                low_price=EXCLUDED.low_price, close_price=EXCLUDED.close_price,
                volume=EXCLUDED.volume""", rows)
    return len(rows)

`````

### main.py

Location: repository root / `main.py`.

`````
"""Run the local ETL pipeline. Exit 1 signals partial or complete failure."""
import argparse
import logging
import sys
import time
from datetime import date, timedelta
from uuid import uuid4

from src.database.connection import connect, initialize
from src.database.load_data import latest_date, load_prices
from src.ingestion.demo import demo_prices
from src.ingestion.fetch_stocks import fetch_stock
from src.settings import ROOT, configuration, database_options
from src.transformation.transform import transform

LOG = logging.getLogger("pipeline")


def run(args) -> int:
    config = configuration()
    database_options()
    if args.check_config:
        print("Configuration loaded; database credentials present (password hidden).")
        return 0
    source = "SYNTHETIC DEMO" if args.demo else "Yahoo Finance / yfinance"
    with connect() as conn:
        initialize(conn)
        if args.init_db:
            print("Database schema and SQL views ready.")
            return 0
        # One loader at a time; session lock releases even after a process crash.
        if not conn.execute("SELECT pg_try_advisory_lock(714283)").fetchone()[0]:
            raise RuntimeError("Another pipeline run is already active")
        conn.execute("INSERT INTO dataset_metadata(singleton,source) VALUES(TRUE,%s) ON CONFLICT DO NOTHING", (source,))
        existing = conn.execute("SELECT source FROM dataset_metadata").fetchone()[0]
        if existing != source:
            raise ValueError("Use a separate POSTGRES_DB for demo and live data.")
        run_id = uuid4().hex
        conn.execute("INSERT INTO pipeline_runs(run_id,status,source) VALUES(%s,'running',%s)", (run_id, source))
        conn.commit()
        errors = 0
        LOG.info("Starting ingestion: %s", source)
        for stock in config["stocks"]:
            symbol = stock["symbol"]
            try:
                first = date.fromisoformat(str(config["start_date"]))
                last = latest_date(conn, symbol)
                conn.commit()
                start = first if args.full_refresh or not last else max(first, last - timedelta(days=int(config["overlap_days"])))
                end = date.today()  # Exclusive: never load today's incomplete candle.
                if start >= end:
                    raise ValueError("Configured start must precede today")
                filename = f"{run_id}_{symbol}.csv"
                raw_path = ROOT / "data/raw" / filename
                LOG.info("Fetching %s from %s", symbol, start)
                if args.demo:
                    raw = demo_prices(symbol, start, end)
                    raw.to_csv(raw_path, index=False)
                else:
                    raw = fetch_stock(symbol, start, end, raw_path)
                clean, rejected = transform(raw, symbol)
                rejected.to_csv(ROOT / "data/rejected" / filename, index=False)
                clean.to_csv(ROOT / "data/processed" / filename, index=False)
                if clean.empty:
                    raise ValueError("No valid rows to load")
                count = load_prices(conn, stock, clean)
                conn.commit()
                LOG.info("%s upserted %d valid rows", symbol, count)
            except Exception as exc:
                conn.rollback()
                errors += 1
                LOG.error("%s failed (%s). Check configuration, raw files and service availability.", symbol, type(exc).__name__)
            finally:
                if not args.demo:
                    time.sleep(float(config["request_pause_seconds"]))
        status = "success" if not errors else "failed" if errors == len(config["stocks"]) else "partial"
        conn.execute("UPDATE pipeline_runs SET status=%s,finished_at=now() WHERE run_id=%s", (status, run_id))
        conn.commit()
        LOG.info("Ingestion completed: %s; %d failed stocks", status, errors)
        return int(bool(errors))


if __name__ == "__main__":
    for folder in ("logs", "data/raw", "data/processed", "data/rejected"):
        (ROOT / folder).mkdir(parents=True, exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s",
                        handlers=[logging.StreamHandler(), logging.FileHandler(ROOT / "logs/pipeline.log")])
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--full-refresh", action="store_true", help="Refetch full configured history for provider corrections")
    parser.add_argument("--check-config", action="store_true")
    parser.add_argument("--init-db", action="store_true")
    try:
        sys.exit(run(parser.parse_args()))
    except Exception as exc:
        LOG.error("Pipeline could not run (%s). Check database configuration, provider access and README troubleshooting.", type(exc).__name__)
        sys.exit(1)

`````

## Step 8 — SQL analytics

### sql/views.sql

Location: repository root / `sql/views.sql`.

`````
CREATE OR REPLACE VIEW daily_analytics AS
WITH prices AS (
    SELECT s.symbol, p.*,
           LAG(close_price) OVER w AS previous_close,
           CASE WHEN COUNT(*) OVER w7 = 7 THEN AVG(close_price) OVER w7 END AS ma_7,
           CASE WHEN COUNT(*) OVER w30 = 30 THEN AVG(close_price) OVER w30 END AS ma_30
    FROM daily_prices p JOIN stocks s USING (stock_id)
    WINDOW w AS (PARTITION BY stock_id ORDER BY date),
           w7 AS (PARTITION BY stock_id ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
           w30 AS (PARTITION BY stock_id ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)
), returns AS (
    SELECT *, close_price / NULLIF(previous_close, 0) - 1 AS daily_return,
           (high_price - low_price) / open_price AS intraday_range
    FROM prices
)
SELECT *, CASE WHEN COUNT(daily_return) OVER w = 30
               THEN STDDEV_SAMP(daily_return) OVER w END AS volatility_30
FROM returns
WINDOW w AS (PARTITION BY stock_id ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW);

CREATE OR REPLACE VIEW stock_summary AS
SELECT symbol, MIN(date) AS first_date, MAX(date) AS last_date,
       AVG(volume) AS average_volume,
       MAX(close_price) AS highest_close, MIN(close_price) AS lowest_close,
       (ARRAY_AGG(date ORDER BY volume DESC, date DESC))[1] AS highest_volume_day,
       (ARRAY_AGG(date ORDER BY daily_return DESC NULLS LAST, date DESC)
        FILTER (WHERE daily_return IS NOT NULL))[1] AS best_day,
       (ARRAY_AGG(date ORDER BY daily_return ASC NULLS LAST, date DESC)
        FILTER (WHERE daily_return IS NOT NULL))[1] AS worst_day,
       (ARRAY_AGG(close_price ORDER BY date DESC))[1] /
       (ARRAY_AGG(close_price ORDER BY date))[1] - 1 AS total_return
FROM daily_analytics GROUP BY symbol;

CREATE OR REPLACE VIEW monthly_returns AS
WITH closes AS (
    SELECT symbol, DATE_TRUNC('month', date)::date AS month,
           (ARRAY_AGG(close_price ORDER BY date DESC))[1] AS month_close
    FROM daily_analytics GROUP BY symbol, DATE_TRUNC('month', date)
)
SELECT *, month_close / NULLIF(LAG(month_close) OVER
       (PARTITION BY symbol ORDER BY month), 0) - 1 AS monthly_return
FROM closes;

`````

### sql/analytics.sql

Location: repository root / `sql/analytics.sql`.

`````
-- Example inspection queries; all windows live in views.sql.
SELECT * FROM stock_summary ORDER BY total_return DESC;
SELECT * FROM monthly_returns ORDER BY month DESC, symbol;
SELECT symbol, date, daily_return, ma_7, ma_30, volatility_30, intraday_range
FROM daily_analytics ORDER BY date DESC, symbol LIMIT 25;
SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 10;

`````

### src/analytics/metrics.py

Location: repository root / `src/analytics/metrics.py`.

`````
"""Parameterized SQL queries. Window metrics are computed before UI date filters."""
import pandas as pd


def query(conn, sql, params=()):
    with conn.cursor() as cursor:
        cursor.execute(sql, params)
        return pd.DataFrame(cursor.fetchall(), columns=[col.name for col in cursor.description])


def history(conn, symbols, start, end):
    frame = query(conn, """SELECT * FROM daily_analytics
                  WHERE symbol=ANY(%s) AND date BETWEEN %s AND %s ORDER BY date,symbol""",
                  (symbols, start, end))
    for col in ("open_price", "high_price", "low_price", "close_price", "daily_return",
                "ma_7", "ma_30", "intraday_range", "volatility_30"):
        frame[col] = pd.to_numeric(frame[col], errors="coerce")
    return frame


def period_summary(conn, symbols, start, end):
    return query(conn, """SELECT symbol, MIN(date) AS first_date, MAX(date) AS last_date,
        AVG(volume)::float AS average_volume,
        (ARRAY_AGG(close_price ORDER BY date DESC))[1]::float AS latest_price,
        (ARRAY_AGG(daily_return ORDER BY date DESC))[1]::float AS daily_change,
        ((ARRAY_AGG(close_price ORDER BY date DESC))[1] /
         (ARRAY_AGG(close_price ORDER BY date))[1] - 1)::float AS period_return,
        (ARRAY_AGG(volume ORDER BY date DESC))[1] AS latest_volume
        FROM daily_analytics WHERE symbol=ANY(%s) AND date BETWEEN %s AND %s
        GROUP BY symbol ORDER BY symbol""", (symbols, start, end))


def comparison(conn, symbols, start, end):
    # Restrict to actual common sessions: all lines share the same base/end dates.
    return query(conn, """WITH selected AS (
        SELECT symbol,date,close_price FROM daily_analytics
        WHERE symbol=ANY(%s) AND date BETWEEN %s AND %s
    ), common AS (SELECT date FROM selected GROUP BY date HAVING COUNT(*)=%s)
    SELECT symbol,date,(close_price / FIRST_VALUE(close_price) OVER
        (PARTITION BY symbol ORDER BY date)-1)::float AS cumulative_return
    FROM selected JOIN common USING(date) ORDER BY date,symbol""",
        (symbols, start, end, len(symbols)))

`````

## Step 9 — React and local Streamlit

### web/main.jsx

Location: repository root / `web/main.jsx`.

`````
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./style.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

`````

### web/App.jsx

Location: repository root / `web/App.jsx`.

`````
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

`````

### web/analytics.js

Location: repository root / `web/analytics.js`.

`````
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

`````

### web/style.css

Location: repository root / `web/style.css`.

`````
:root {
  font-family:
    "DM Sans",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  color-scheme: dark;
  --bg: #10161c;
  --panel: #151d25;
  --sidebar: #121920;
  --text: #e6edf5;
  --muted: #94a2b3;
  --line: #26313e;
  --accent: #499aff;
  --input: #1a2430;
  --hover: #202e3e;
  --positive: #55c9a4;
  --negative: #ef8491;
  --banner: #192a35;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  color: var(--text);
  background: var(--bg);
}
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #f5f7fa;
  --panel: #fff;
  --sidebar: #fff;
  --text: #172434;
  --muted: #596a7d;
  --line: #e1e7ee;
  --accent: #216ac9;
  --input: #f6f8fb;
  --hover: #eaf1fb;
  --positive: #087452;
  --negative: #b53949;
  --banner: #eaf2fc;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
button,
input,
select {
  font: inherit;
}
button,
a,
input,
select {
  -webkit-tap-highlight-color: transparent;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}
a {
  color: inherit;
  text-decoration: none;
}
.shell {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 224px;
  flex-shrink: 0;
  background: var(--sidebar);
  border-right: 1px solid var(--line);
  padding: 36px 20px 24px;
  position: fixed;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}
.brand {
  display: flex;
  gap: 11px;
  align-items: center;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.7px;
  padding: 0 7px;
}
.brand > svg {
  color: var(--accent);
}
.brand-light {
  font-weight: 450;
}
.brand small {
  display: block;
  font-weight: 500;
  font-size: 10px;
  letter-spacing: 1.7px;
  color: var(--muted);
  margin-top: 7px;
}
.nav-label {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 1.6px;
  margin: 51px 12px 17px;
}
.nav {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 14px 13px;
  margin: 3px 0;
  border-radius: 7px;
  font-size: 14px;
  text-align: left;
}
.nav:hover {
  background: var(--hover);
  color: var(--text);
}
.nav.active {
  background: var(--hover);
  color: var(--accent);
  font-weight: 600;
}
.nav-mark {
  margin-left: auto;
  width: 4px;
  height: 16px;
  background: var(--accent);
  border-radius: 4px;
}
.sidebar-bottom {
  margin-top: auto;
}
.theme-toggle {
  display: flex;
  padding: 4px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 7px;
}
.theme-toggle button {
  width: 50%;
  border: 0;
  background: transparent;
  color: var(--muted);
  border-radius: 4px;
  padding: 8px 3px;
  font-size: 13px;
  display: flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
}
.theme-toggle .chosen {
  background: var(--input);
  color: var(--text);
}
.repo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
  padding: 24px 8px 14px;
}
.author {
  font-size: 11px;
  color: var(--muted);
  padding: 0 8px;
}
main {
  margin-left: 224px;
  min-width: 0;
  width: calc(100% - 224px);
}
header {
  height: 78px;
  padding: 0 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}
.breadcrumb {
  font-size: 13px;
  color: var(--muted);
}
.breadcrumb span {
  margin: 0 16px;
  color: var(--line);
}
.breadcrumb b {
  font-weight: 500;
  color: var(--text);
}
.header-right {
  display: flex;
  gap: 22px;
  align-items: center;
}
.daily-tag {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: var(--muted);
}
.icon-button {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 6px;
}
.content {
  max-width: 1500px;
  padding: 36px 42px 20px;
  margin: auto;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}
.eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.8px;
  color: var(--accent);
  margin-bottom: 10px;
}
h1 {
  font-size: 30px;
  letter-spacing: -1px;
  font-weight: 550;
  line-height: 1.25;
  margin: 0;
}
p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}
.page-heading p {
  margin: 9px 0 0;
}
.secondary {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  border-radius: 6px;
  padding: 10px 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 13px;
}
.secondary:hover {
  border-color: var(--muted);
}
.demo-banner {
  background: var(--banner);
  border: 1px solid var(--line);
  padding: 11px 15px;
  border-radius: 6px;
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 24px;
}
.badge {
  font-size: 10px;
  font-weight: 650;
  color: var(--accent);
  letter-spacing: 0.8px;
  white-space: nowrap;
}
.filters {
  display: flex;
  align-items: end;
  gap: 24px;
  margin: 25px 0 28px;
  flex-wrap: wrap;
}
.filters label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
}
.filters input,
.filters select {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  letter-spacing: 0;
  min-height: 40px;
}
.filters select {
  min-width: 185px;
}
.dates {
  display: flex;
  gap: 12px;
  align-items: end;
}
.date-dash {
  padding-bottom: 12px;
  color: var(--muted);
}
.presets {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
  margin-left: auto;
  height: 40px;
}
.presets button {
  border: 0;
  border-right: 1px solid var(--line);
  padding: 0 12px;
  background: var(--panel);
  color: var(--muted);
  font-size: 12px;
}
.presets button:last-child {
  border-right: 0;
}
.presets button:hover {
  background: var(--hover);
  color: var(--accent);
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 28px;
  padding: 5px 0 7px;
  gap: 20px;
}
.metric {
  border-right: 1px solid var(--line);
  padding: 0 20px 0 0;
  min-width: 0;
}
.metric:last-child {
  border-right: 0;
}
.metric > span {
  font-size: 10px;
  letter-spacing: 1.1px;
  color: var(--muted);
  font-weight: 600;
  display: block;
}
.metric strong {
  display: block;
  font-size: 30px;
  font-weight: 500;
  letter-spacing: -0.6px;
  font-variant-numeric: tabular-nums;
  margin: 12px 0 7px;
}
.metric small {
  font-size: 12px;
  color: var(--muted);
}
.positive {
  color: var(--positive) !important;
}
.negative {
  color: var(--negative) !important;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 9px;
  overflow: hidden;
  margin-bottom: 22px;
}
.panel-heading {
  padding: 24px 25px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.company {
  display: flex;
  gap: 13px;
  align-items: center;
}
.ticker-icon {
  width: 40px;
  height: 40px;
  background: var(--input);
  border: 1px solid var(--line);
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 600;
}
h2 {
  font-size: 16px;
  font-weight: 550;
  margin: 0;
  letter-spacing: -0.2px;
}
h2 span {
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 450;
  color: var(--muted);
  margin-left: 8px;
}
.panel-heading p {
  font-size: 12px;
  margin: 5px 0 0;
}
.unit {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--muted);
  border: 1px solid var(--line);
  padding: 5px 7px;
  border-radius: 4px;
  white-space: nowrap;
}
.chart {
  height: 340px;
  margin: 7px 18px 22px 20px;
}
.chart-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 25px;
  border-top: 1px solid var(--line);
  font-size: 11px;
  color: var(--muted);
}
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}
.details {
  padding: 22px 25px;
}
.details h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.details p {
  font-size: 13px;
}
.details dl {
  margin-bottom: 0;
}
.details dl > div {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
}
.details dt {
  color: var(--muted);
}
.details dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.compare-controls {
  display: flex;
  gap: 19px;
  align-items: center;
  flex-wrap: wrap;
  margin: 0 0 24px;
  font-size: 13px;
}
.compare-controls > span {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--muted);
  margin-right: 4px;
}
.compare-controls label {
  display: flex;
  align-items: center;
  gap: 7px;
}
.compare-controls input {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
}
.movers {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 10px 0;
}
.table-scroll {
  overflow-x: auto;
  max-height: 500px;
}
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
th,
td {
  padding: 13px 20px;
  border-bottom: 1px solid var(--line);
  text-align: right;
}
th {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.4px;
  color: var(--muted);
  position: sticky;
  top: 0;
  background: var(--panel);
}
th:first-child,
td:first-child {
  text-align: left;
}
tbody tr:hover {
  background: var(--hover);
}
footer {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  color: var(--muted);
  font-size: 11px;
  padding: 7px 0 10px;
}
.footer-separator {
  padding: 0 10px;
}
.empty,
.loading {
  padding: 70px 20px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--line);
  border-radius: 8px;
}
.empty .secondary {
  display: flex;
  margin: 20px auto 0;
}
.loading {
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
  }
}
@media (min-width: 1600px) {
  .content {
    padding-top: 45px;
  }
  .chart {
    height: 420px;
  }
}
@media (max-width: 1150px) {
  .sidebar {
    width: 190px;
    padding-left: 14px;
    padding-right: 14px;
  }
  main {
    margin-left: 190px;
    width: calc(100% - 190px);
  }
  .content {
    padding: 28px 25px 20px;
  }
  header {
    padding: 0 25px;
  }
  .filters {
    gap: 16px;
  }
  .presets {
    margin-left: 0;
  }
  .metric strong {
    font-size: 25px;
  }
  .brand {
    font-size: 18px;
    gap: 8px;
  }
}
@media (max-width: 760px) {
  .shell {
    display: block;
  }
  .sidebar {
    position: static;
    width: 100%;
    height: auto;
    padding: 18px 16px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .brand {
    font-size: 19px;
  }
  .brand small,
  .nav-label,
  .repo,
  .author {
    display: none;
  }
  .sidebar nav {
    display: flex;
    gap: 3px;
    margin-top: 20px;
  }
  .nav {
    font-size: 12px;
    padding: 10px 7px;
    justify-content: center;
    gap: 7px;
  }
  .nav-mark {
    display: none;
  }
  .sidebar-bottom {
    position: absolute;
    right: 16px;
    top: 17px;
    width: 150px;
  }
  .theme-toggle button {
    font-size: 11px;
  }
  .theme-toggle button svg {
    width: 12px;
  }
  main {
    margin: 0;
    width: 100%;
  }
  header {
    height: 55px;
    padding: 0 18px;
  }
  .content {
    padding: 24px 16px 16px;
  }
  .page-heading {
    align-items: start;
    margin-bottom: 20px;
  }
  h1 {
    font-size: 24px;
  }
  .eyebrow {
    font-size: 9px;
  }
  .page-heading p {
    font-size: 13px;
  }
  .export {
    font-size: 0;
    padding: 9px;
  }
  .export svg {
    width: 17px;
  }
  .demo-banner {
    font-size: 11px;
    line-height: 1.5;
    padding: 10px 12px;
    align-items: start;
  }
  .filters {
    gap: 16px;
  }
  .filters > label {
    width: 100%;
  }
  .filters select {
    width: 100%;
  }
  .dates {
    gap: 8px;
    flex: 1;
  }
  .dates input {
    max-width: 155px;
    width: 100%;
  }
  .filters label {
    flex: 1;
  }
  .presets {
    width: 100%;
    height: 36px;
  }
  .presets button {
    flex: 1;
  }
  .metrics {
    grid-template-columns: 1fr 1fr;
    gap: 22px 16px;
  }
  .metric {
    padding-right: 8px;
  }
  .metric:nth-child(2) {
    border: 0;
  }
  .metric strong {
    font-size: 25px;
  }
  .metric > span {
    font-size: 9px;
    letter-spacing: 0.7px;
  }
  .metric small {
    font-size: 11px;
  }
  .panel-heading {
    padding: 18px 16px 5px;
  }
  .chart {
    height: 280px;
    margin: 7px 5px 18px;
  }
  .chart-foot {
    padding: 12px 16px;
    flex-direction: column;
    font-size: 10px;
  }
  .bottom-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .details {
    padding: 20px 16px;
  }
  .compare-controls {
    gap: 12px;
  }
  .compare-controls > span {
    width: 100%;
  }
  .movers {
    grid-template-columns: 1fr;
  }
  .movers .metric {
    border: 0;
  }
  .movers .metric strong {
    font-size: 23px;
  }
  footer {
    font-size: 10px;
    flex-direction: column;
    gap: 7px;
  }
  .daily-tag {
    font-size: 9px;
  }
  th,
  td {
    padding: 12px 15px;
  }
}

`````

### index.html

Location: repository root / `index.html`.

`````
<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="description" content="Explore daily stock prices, SQL analytics, moving averages and market performance."/><meta name="theme-color" content="#12191f"/><title>Data Platform · Stock Analytics</title></head><body><div id="root"></div><script type="module" src="/web/main.jsx"></script></body></html>

`````

### server/market.js

Location: repository root / `server/market.js`.

`````
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

`````

### server/demo.js

Location: repository root / `server/demo.js`.

`````
// Generated fixtures are intentionally distinct from actual market history.
// All demo outputs are deterministic and explicitly labelled by the API/UI.
export function demoData(stocks) {
  const days = [];
  for (
    let d = new Date("2024-01-01T00:00:00Z");
    d < new Date("2026-09-01T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6)
      days.push(d.toISOString().slice(0, 10));
  }
  const prices = [];
  stocks.forEach((stock, index) => {
    let seed = [...stock.symbol].reduce((a, c) => a + c.charCodeAt(0), 37);
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let close = 95 + index * 28;
    const closes = [],
      returns = [];
    days.forEach((date, i) => {
      const previous = close;
      close *= 1 + 0.00065 + (random() - 0.5) * 0.029;
      const open = previous * (1 + (random() - 0.5) * 0.006);
      closes.push(close);
      const daily = i ? close / previous - 1 : null;
      returns.push(daily);
      const window = returns.slice(-30);
      const mean = window.reduce((a, b) => a + b, 0) / 30;
      prices.push({
        symbol: stock.symbol,
        date,
        open_price: open,
        high_price: Math.max(open, close) * 1.007,
        low_price: Math.min(open, close) * 0.993,
        close_price: close,
        volume: Math.floor(15000000 + random() * 65000000),
        daily_return: daily,
        ma_7: i >= 6 ? closes.slice(-7).reduce((a, b) => a + b, 0) / 7 : null,
        ma_30:
          i >= 29 ? closes.slice(-30).reduce((a, b) => a + b, 0) / 30 : null,
        volatility_30:
          i >= 30
            ? Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / 29)
            : null,
      });
    });
  });
  return {
    source: "SYNTHETIC DEMO",
    demo: true,
    stocks,
    prices,
    runs: [],
    monthly: [],
    summary: [],
  };
}

`````

### api/market.js

Location: repository root / `api/market.js`.

`````
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

`````

### dashboard/app.py

Location: repository root / `dashboard/app.py`.

`````
"""Run from project root: python -m streamlit run dashboard/app.py."""
import logging
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pandas as pd
import plotly.express as px
import streamlit as st

from src.analytics.metrics import comparison, history, period_summary, query
from src.database.connection import connect

st.set_page_config(page_title="Stock Analytics", page_icon="↗", layout="wide")
st.title("Stock Analytics")
st.caption("Daily market data · Local PostgreSQL · Price returns in USD")
# Native theme switching also recolors controls, navigation, tables and popovers.
# Unlike CSS overrides it stays consistent with Streamlit's accessibility defaults.
st.sidebar.caption("☀ Light / 🌙 Dark: open ⋮ → Settings → Theme")
page = st.sidebar.radio("Navigate", ["Overview", "Performance", "Volume", "Data"])


def chart(fig):
    fig.update_layout(height=420, margin=dict(l=0, r=10, t=20, b=0),
                      legend=dict(orientation="h", y=1.12),
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
    st.plotly_chart(fig, width="stretch", theme="streamlit")


def app():
    with connect() as conn:
        bounds = query(conn, "SELECT MIN(date) AS first,MAX(date) AS last FROM daily_prices")
        if bounds.iloc[0]["first"] is None:
            st.info("No prices yet. Run python main.py, then refresh this page.")
            return
        source = query(conn, "SELECT source FROM dataset_metadata").iloc[0, 0]
        if source == "SYNTHETIC DEMO":
            st.warning("SYNTHETIC DEMO — generated prices, not real market data.")
        first, last = bounds.iloc[0]
        st.caption(f"Source: {source} · Last stored session: {last}")
        choices = query(conn, "SELECT symbol FROM stocks ORDER BY symbol").symbol.tolist()
        symbol = st.sidebar.selectbox("Stock", choices)
        dates = st.sidebar.date_input("Period", (max(first, last - timedelta(days=365)), last),
                                      min_value=first, max_value=last)
        if len(dates) != 2:
            st.info("Select a start and end date.")
            return
        start, end = dates
        selected = st.sidebar.multiselect("Compare", choices, default=choices)
        prices = history(conn, [symbol], start, end)
        if prices.empty:
            st.info("No data available for the selected date range.")
            return
        summary = period_summary(conn, [symbol], start, end).iloc[0]
        if page == "Overview":
            cols = st.columns(4)
            change = summary.daily_change
            cols[0].metric(f"{symbol} close", f"${summary.latest_price:,.2f}",
                           None if pd.isna(change) else f"{change:.2%}")
            cols[1].metric("Period price return", f"{summary.period_return:.2%}")
            cols[2].metric("Average volume", f"{summary.average_volume/1e6:.2f}M")
            cols[3].metric("Sessions", len(prices))
            chart(px.line(prices, x="date", y=["close_price", "ma_7", "ma_30"],
                          labels={"value": "USD", "date": "", "variable": "Series"}))
            st.caption("MA windows use 7 and 30 trading sessions. Incomplete windows are blank. Returns exclude dividends.")
            with st.expander("Daily risk measures"):
                chart(px.line(prices, x="date", y="volatility_30", labels={"volatility_30": "30-session return standard deviation"}))
                st.caption("Unannualized sample standard deviation; a daily-frequency volatility estimate.")
        elif page == "Performance":
            if not selected:
                st.info("Choose stocks in Compare.")
                return
            compared = comparison(conn, selected, start, end)
            if compared.empty:
                st.info("No common trading sessions for this selection.")
                return
            chart(px.line(compared, x="date", y="cumulative_return", color="symbol",
                          labels={"cumulative_return": "Price return", "date": ""}).update_yaxes(tickformat=".0%"))
            common_start, common_end = compared.date.min(), compared.date.max()
            movers = period_summary(conn, selected, common_start, common_end)
            a, b, c = st.columns(3)
            best = movers.loc[movers.period_return.idxmax()]
            worst = movers.loc[movers.period_return.idxmin()]
            busy = movers.loc[movers.latest_volume.idxmax()]
            a.metric("Best period performer", best.symbol, f"{best.period_return:.2%}")
            b.metric("Worst period performer", worst.symbol, f"{worst.period_return:.2%}")
            c.metric("Highest latest-session volume", busy.symbol, f"{busy.latest_volume/1e6:.2f}M", delta_color="off")
            st.caption(f"Shared sessions: {common_start} to {common_end}. All lines start at 0%.")
            st.dataframe(movers, hide_index=True, width="stretch")
        elif page == "Volume":
            chart(px.bar(prices, x="date", y="volume", labels={"date": "", "volume": "Shares"}))
            peak = prices.loc[prices.volume.idxmax()]
            st.caption(f"Highest-volume selected session: {peak.date} · {peak.volume:,} shares")
        else:
            st.dataframe(prices, hide_index=True, width="stretch")
            st.download_button("Download selected data", prices.to_csv(index=False),
                               f"{symbol}_prices.csv", "text/csv")
            st.subheader("All-history SQL summary")
            st.dataframe(query(conn, "SELECT * FROM stock_summary WHERE symbol=%s", (symbol,)), hide_index=True)
            st.subheader("Monthly close-to-close returns")
            st.caption("First available month has no prior close; the latest month may be incomplete.")
            st.dataframe(query(conn, "SELECT * FROM monthly_returns WHERE symbol=%s ORDER BY month DESC", (symbol,)), hide_index=True)
            st.subheader("Pipeline runs")
            st.dataframe(query(conn, "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 10"), hide_index=True)


try:
    app()
except Exception as exc:
    logging.getLogger(__name__).error("Dashboard load failed (%s)", type(exc).__name__)
    st.error("Unable to load market data. Check that PostgreSQL is running and run python main.py --init-db, then refresh.")

`````

### .streamlit/config.toml

Location: repository root / `.streamlit/config.toml`.

`````
[browser]
gatherUsageStats = false
[theme.light]
primaryColor = "#247B6C"
backgroundColor = "#FAFBFC"
secondaryBackgroundColor = "#EEF1F4"
textColor = "#17212B"
[theme.dark]
primaryColor = "#68BFAE"
backgroundColor = "#10151C"
secondaryBackgroundColor = "#1A2330"
textColor = "#E8EDF3"

`````

## Step 10 — Tests

### tests/test_transform.py

Location: repository root / `tests/test_transform.py`.

`````
import numpy as np
import pandas as pd
import pytest
from src.transformation.transform import transform


def sample():
    return pd.DataFrame({"Date": ["2024-01-02"], "Open": [100], "High": [110],
                         "Low": [90], "Close": [105], "Volume": [1000]})


@pytest.mark.parametrize("column,value", [("Date", "bad"), ("Close", None),
    ("Open", -1), ("High", 80), ("Low", 108), ("Volume", -5),
    ("Volume", 1.5), ("Close", np.inf), ("Date", "2999-01-01")])
def test_rejects_bad_rows(column, value):
    frame = sample().astype(object)
    frame.loc[0, column] = value
    clean, bad = transform(frame, "AAPL")
    assert clean.empty and len(bad) == 1 and bad.reason.iloc[0]


def test_duplicate_keeps_last_and_audits():
    frame = pd.concat([sample(), sample()], ignore_index=True)
    frame.loc[1, "Close"] = 106
    clean, bad = transform(frame, "AAPL")
    assert len(clean) == 1 and clean.close_price.iloc[0] == 106
    assert "duplicate" in bad.reason.iloc[0]


def test_clean_and_normalize():
    frame = sample()
    frame.columns = [" " + c.upper() + " " for c in frame.columns]
    clean, bad = transform(frame, "MSFT")
    assert len(clean) == 1 and bad.empty and clean.symbol.iloc[0] == "MSFT"


def test_missing_schema():
    with pytest.raises(ValueError):
        transform(pd.DataFrame({"foo": [1]}), "AAPL")

`````

### tests/test_ingestion.py

Location: repository root / `tests/test_ingestion.py`.

`````
from datetime import date
from unittest.mock import Mock
import pandas as pd
import pytest
from src.ingestion import fetch_stocks


def test_retries_preserve_raw(tmp_path, monkeypatch):
    ticker = Mock()
    ticker.history.side_effect = [RuntimeError("rate limited"), pd.DataFrame(
        {"Open": [1], "High": [2], "Low": [1], "Close": [2], "Volume": [3]},
        index=pd.DatetimeIndex(["2024-01-02"], name="Date"))]
    monkeypatch.setattr(fetch_stocks.yf, "Ticker", lambda _: ticker)
    monkeypatch.setattr(fetch_stocks.time, "sleep", lambda _: None)
    path = tmp_path / "raw.csv"
    result = fetch_stocks.fetch_stock("AAPL", date(2024,1,1), date(2024,2,1), path)
    assert ticker.history.call_count == 2 and len(result) == 1 and path.exists()


def test_exhausted_retries(tmp_path, monkeypatch):
    ticker = Mock()
    ticker.history.side_effect = RuntimeError("offline")
    monkeypatch.setattr(fetch_stocks.yf, "Ticker", lambda _: ticker)
    monkeypatch.setattr(fetch_stocks.time, "sleep", lambda _: None)
    with pytest.raises(RuntimeError):
        fetch_stocks.fetch_stock("AAPL", date(2024,1,1), date(2024,2,1), tmp_path/"raw.csv")
    assert ticker.history.call_count == 3

`````

### tests/test_database.py

Location: repository root / `tests/test_database.py`.

`````
"""Test real PostgreSQL functions and constraints, not a SQLite approximation."""
import os
from datetime import date, timedelta
from uuid import uuid4

import pandas as pd
import pytest

from src.database.connection import connect
from src.database.load_data import load_prices
from src.settings import ROOT

pytestmark = pytest.mark.integration


@pytest.fixture
def db():
    if os.getenv("RUN_DB_TESTS") != "1":
        pytest.skip("Set RUN_DB_TESTS=1 with local PostgreSQL running")
    with connect() as conn:
        name = "test_" + uuid4().hex
        conn.execute(f'CREATE SCHEMA "{name}"')
        conn.execute(f'SET LOCAL search_path TO "{name}"')
        for filename in ("schema.sql", "views.sql"):
            conn.execute((ROOT / "sql" / filename).read_text())
        yield conn
        conn.rollback()  # Rolls back the isolated schema and all fixtures.


def frame():
    return pd.DataFrame([dict(date=date(2024, 1, 1) + timedelta(days=i),
        open_price=100+i, high_price=102+i, low_price=99+i,
        close_price=100+i, volume=1000+i) for i in range(35)])


STOCK = dict(symbol="TEST", company_name="Test", sector="Test")


def test_upsert_and_constraint(db):
    data = frame()
    load_prices(db, STOCK, data)
    data.loc[0, "close_price"] = 101
    load_prices(db, STOCK, data)
    assert db.execute("SELECT COUNT(*) FROM daily_prices").fetchone()[0] == 35
    assert db.execute("SELECT close_price FROM daily_prices ORDER BY date LIMIT 1").fetchone()[0] == 101
    import psycopg
    with pytest.raises(psycopg.errors.CheckViolation):
        with db.transaction():
            db.execute("UPDATE daily_prices SET volume=-1")


def test_sql_metrics(db):
    load_prices(db, STOCK, frame())
    rows = db.execute("SELECT daily_return,ma_7,ma_30,volatility_30 FROM daily_analytics ORDER BY date").fetchall()
    assert rows[0][0] is None and rows[5][1] is None and rows[28][2] is None
    assert float(rows[1][0]) == pytest.approx(0.01)
    assert float(rows[6][1]) == pytest.approx(103)
    assert float(rows[29][2]) == pytest.approx(114.5)
    assert rows[29][3] is None and rows[30][3] is not None
    summary = db.execute("SELECT total_return FROM stock_summary").fetchone()[0]
    assert float(summary) == pytest.approx(0.34)
    months = db.execute("SELECT monthly_return FROM monthly_returns ORDER BY month").fetchall()
    assert months[0][0] is None
    assert float(months[1][0]) == pytest.approx(134/130-1)

`````

### tests/test_settings.py

Location: repository root / `tests/test_settings.py`.

`````
import pytest
from src.settings import database_options, configuration


def test_shared_stock_configuration():
    cfg = configuration()
    assert len(cfg['stocks']) == 5
    assert len({s['symbol'] for s in cfg['stocks']}) == 5


def test_neon_connection_uses_tls(monkeypatch):
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example:placeholder@test.neon.tech/neondb?sslmode=require')
    assert database_options()['conninfo'].endswith('sslmode=require')


def test_remote_plaintext_connection_rejected(monkeypatch):
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example:placeholder@test.neon.tech/neondb')
    with pytest.raises(ValueError, match='TLS'):
        database_options()


def test_pooler_rejected_for_session_lock(monkeypatch):
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example:placeholder@test-pooler.neon.tech/neondb?sslmode=require')
    with pytest.raises(ValueError, match='direct Neon'):
        database_options()

`````

### tests/web.test.js

Location: repository root / `tests/web.test.js`.

`````
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

`````

### pytest.ini

Location: repository root / `pytest.ini`.

`````
[pytest]
pythonpath = .
markers =
    integration: requires a local PostgreSQL database; uses an isolated rollback schema

`````

## Step 11 — Docker, Vercel and scheduling

### docker-compose.yml

Location: repository root / `docker-compose.yml`.

`````
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-stock_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: ${POSTGRES_DB:-stocks}
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 12
    restart: unless-stopped
volumes:
  postgres_data:

`````

### vercel.json

Location: repository root / `vercel.json`.

`````
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {"api/market.js": {"maxDuration": 10}},
  "headers": [{"source": "/(.*)", "headers": [
    {"key": "X-Content-Type-Options", "value": "nosniff"},
    {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
    {"key": "X-Frame-Options", "value": "DENY"}
  ]}]
}

`````

### vite.config.js

Location: repository root / `vite.config.js`.

`````
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import market from "./api/market.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Server-only: Vite only exposes VITE_* variables to browser bundles.
  for (const key of ["DATABASE_URL", "DEMO_MODE"]) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [
      react(),
      {
        name: "local-market-api",
        configureServer(server) {
          server.middlewares.use("/api/market", market);
        },
        configurePreviewServer(server) {
          server.middlewares.use("/api/market", market);
        },
      },
    ],
  };
});

`````

### .github/workflows/ingest.yml

Location: repository root / `.github/workflows/ingest.yml`.

`````
name: Daily market ingestion
on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * *'
permissions:
  contents: read
concurrency:
  group: market-ingestion
  cancel-in-progress: false
jobs:
  ingest:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
    steps:
      - name: Check database configuration
        id: config
        shell: bash
        run: |
          if [ -n "$DATABASE_URL" ]; then
            echo "configured=true" >> "$GITHUB_OUTPUT"
          else
            echo "Database not configured. Add the DATABASE_URL repository secret to enable ingestion."
          fi
      - uses: actions/checkout@v4
        if: steps.config.outputs.configured == 'true'
      - uses: actions/setup-python@v5
        if: steps.config.outputs.configured == 'true'
        with:
          python-version: '3.12'
          cache: pip
      - name: Install pipeline dependencies
        if: steps.config.outputs.configured == 'true'
        run: python -m pip install -r requirements-pipeline.txt
      - name: Ingest daily observations
        if: steps.config.outputs.configured == 'true'
        # Sunday refresh catches corrections outside the normal overlap.
        shell: bash
        run: |
          if [ "$(date -u +%u)" = "7" ]; then
            python main.py --full-refresh
          else
            python main.py
          fi

`````

## Step 12 — Verification and documentation

### VALIDATION.md

Location: repository root / `VALIDATION.md`.

`````
# Validation report — 10 September 2026

## Verified locally

- React/Vite production build completes.
- Six JavaScript tests pass: shared-date rebasing, empty selections, period returns, CSV output, deterministic labelled demo, complete MA windows, explicit demo mode, and rejection of public writes.
- Python: **18 passed, 2 skipped**. Includes transformation, duplicate auditing, retries, shared configuration and direct/TLS Neon URL validation.
- Original Streamlit: all four views were checked using synthetic query fixtures during the initial implementation.

## External checks and limits

- The two real-PostgreSQL integration tests require a database; no local Docker/PostgreSQL server is available here.
- No Neon database credential has been supplied. Live database reads, migrations and scheduled ingestion must be verified after following docs/NEON_SETUP.md.
- Yahoo's earlier live fetch was rate-limited/timed out. Successful live ingestion is not claimed.
- Browser automation could not launch in this workspace and the browser download timed out. Browser-level visual QA is not claimed.
- Explicit React demo mode requires DEMO_MODE=true. No configured live database failure silently switches to demo prices.

Follow the README to verify locally, and confirm a successful Actions ingestion run before using the hosted site with DEMO_MODE=false.

`````

### .gitignore

Location: repository root / `.gitignore`.

`````
.env
.env.*
!.env.example
.venv/
__pycache__/
.pytest_cache/
*.pyc
data/raw/*
data/processed/*
data/rejected/*
logs/*
!**/.gitkeep
node_modules/
dist/
.vercel/
.sites-runtime/
*.log

`````
