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
