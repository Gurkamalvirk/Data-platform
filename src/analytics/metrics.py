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
