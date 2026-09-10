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
