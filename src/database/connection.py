import psycopg
from src.settings import ROOT, database_options


def connect():
    return psycopg.connect(**database_options())


def initialize(conn) -> None:
    for filename in ("schema.sql", "views.sql"):
        conn.execute((ROOT / "sql" / filename).read_text())
    conn.commit()
