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
