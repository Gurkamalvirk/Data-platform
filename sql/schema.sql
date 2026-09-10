CREATE TABLE IF NOT EXISTS stocks (
    stock_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    sector TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS daily_prices (
    price_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_id BIGINT NOT NULL REFERENCES stocks(stock_id),
    date DATE NOT NULL,
    open_price NUMERIC(20,6) NOT NULL CHECK (open_price > 0),
    high_price NUMERIC(20,6) NOT NULL CHECK (high_price > 0),
    low_price NUMERIC(20,6) NOT NULL CHECK (low_price > 0),
    close_price NUMERIC(20,6) NOT NULL CHECK (close_price > 0),
    volume BIGINT NOT NULL CHECK (volume >= 0),
    UNIQUE (stock_id, date),
    CHECK (high_price >= GREATEST(open_price, close_price, low_price)),
    CHECK (low_price <= LEAST(open_price, close_price))
);
CREATE INDEX IF NOT EXISTS idx_prices_date ON daily_prices(date);
CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id TEXT PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    source TEXT NOT NULL
);
-- Prevent accidental mixing of synthetic and actual observations.
CREATE TABLE IF NOT EXISTS dataset_metadata (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    source TEXT NOT NULL
);
