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
