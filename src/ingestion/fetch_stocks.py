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
