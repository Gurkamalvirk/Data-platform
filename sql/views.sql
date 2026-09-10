CREATE OR REPLACE VIEW daily_analytics AS
WITH prices AS (
    SELECT s.symbol, p.*,
           LAG(close_price) OVER w AS previous_close,
           CASE WHEN COUNT(*) OVER w7 = 7 THEN AVG(close_price) OVER w7 END AS ma_7,
           CASE WHEN COUNT(*) OVER w30 = 30 THEN AVG(close_price) OVER w30 END AS ma_30
    FROM daily_prices p JOIN stocks s USING (stock_id)
    WINDOW w AS (PARTITION BY stock_id ORDER BY date),
           w7 AS (PARTITION BY stock_id ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
           w30 AS (PARTITION BY stock_id ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)
), returns AS (
    SELECT *, close_price / NULLIF(previous_close, 0) - 1 AS daily_return,
           (high_price - low_price) / open_price AS intraday_range
    FROM prices
)
SELECT *, CASE WHEN COUNT(daily_return) OVER w = 30
               THEN STDDEV_SAMP(daily_return) OVER w END AS volatility_30
FROM returns
WINDOW w AS (PARTITION BY stock_id ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW);

CREATE OR REPLACE VIEW stock_summary AS
SELECT symbol, MIN(date) AS first_date, MAX(date) AS last_date,
       AVG(volume) AS average_volume,
       MAX(close_price) AS highest_close, MIN(close_price) AS lowest_close,
       (ARRAY_AGG(date ORDER BY volume DESC, date DESC))[1] AS highest_volume_day,
       (ARRAY_AGG(date ORDER BY daily_return DESC NULLS LAST, date DESC)
        FILTER (WHERE daily_return IS NOT NULL))[1] AS best_day,
       (ARRAY_AGG(date ORDER BY daily_return ASC NULLS LAST, date DESC)
        FILTER (WHERE daily_return IS NOT NULL))[1] AS worst_day,
       (ARRAY_AGG(close_price ORDER BY date DESC))[1] /
       (ARRAY_AGG(close_price ORDER BY date))[1] - 1 AS total_return
FROM daily_analytics GROUP BY symbol;

CREATE OR REPLACE VIEW monthly_returns AS
WITH closes AS (
    SELECT symbol, DATE_TRUNC('month', date)::date AS month,
           (ARRAY_AGG(close_price ORDER BY date DESC))[1] AS month_close
    FROM daily_analytics GROUP BY symbol, DATE_TRUNC('month', date)
)
SELECT *, month_close / NULLIF(LAG(month_close) OVER
       (PARTITION BY symbol ORDER BY month), 0) - 1 AS monthly_return
FROM closes;
