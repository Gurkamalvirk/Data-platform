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
