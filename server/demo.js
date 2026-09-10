// Generated fixtures are intentionally distinct from actual market history.
// All demo outputs are deterministic and explicitly labelled by the API/UI.
export function demoData(stocks) {
  const days = [];
  for (
    let d = new Date("2024-01-01T00:00:00Z");
    d < new Date("2026-09-01T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6)
      days.push(d.toISOString().slice(0, 10));
  }
  const prices = [];
  stocks.forEach((stock, index) => {
    let seed = [...stock.symbol].reduce((a, c) => a + c.charCodeAt(0), 37);
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let close = 95 + index * 28;
    const closes = [],
      returns = [];
    days.forEach((date, i) => {
      const previous = close;
      close *= 1 + 0.00065 + (random() - 0.5) * 0.029;
      const open = previous * (1 + (random() - 0.5) * 0.006);
      closes.push(close);
      const daily = i ? close / previous - 1 : null;
      returns.push(daily);
      const window = returns.slice(-30);
      const mean = window.reduce((a, b) => a + b, 0) / 30;
      prices.push({
        symbol: stock.symbol,
        date,
        open_price: open,
        high_price: Math.max(open, close) * 1.007,
        low_price: Math.min(open, close) * 0.993,
        close_price: close,
        volume: Math.floor(15000000 + random() * 65000000),
        daily_return: daily,
        ma_7: i >= 6 ? closes.slice(-7).reduce((a, b) => a + b, 0) / 7 : null,
        ma_30:
          i >= 29 ? closes.slice(-30).reduce((a, b) => a + b, 0) / 30 : null,
        volatility_30:
          i >= 30
            ? Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / 29)
            : null,
      });
    });
  });
  return {
    source: "SYNTHETIC DEMO",
    demo: true,
    stocks,
    prices,
    runs: [],
    monthly: [],
    summary: [],
  };
}
