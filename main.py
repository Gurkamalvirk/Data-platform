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
