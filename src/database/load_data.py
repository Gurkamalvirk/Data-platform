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
