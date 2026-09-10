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
