-- Example inspection queries; all windows live in views.sql.
SELECT * FROM stock_summary ORDER BY total_return DESC;
SELECT * FROM monthly_returns ORDER BY month DESC, symbol;
SELECT symbol, date, daily_return, ma_7, ma_30, volatility_30, intraday_range
FROM daily_analytics ORDER BY date DESC, symbol LIMIT 25;
SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 10;
