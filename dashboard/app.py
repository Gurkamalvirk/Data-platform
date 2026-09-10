"""Run from project root: python -m streamlit run dashboard/app.py."""
import logging
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pandas as pd
import plotly.express as px
import streamlit as st

from src.analytics.metrics import comparison, history, period_summary, query
from src.database.connection import connect

st.set_page_config(page_title="Stock Analytics", page_icon="↗", layout="wide")
st.title("Stock Analytics")
st.caption("Daily market data · Local PostgreSQL · Price returns in USD")
# Native theme switching also recolors controls, navigation, tables and popovers.
# Unlike CSS overrides it stays consistent with Streamlit's accessibility defaults.
st.sidebar.caption("☀ Light / 🌙 Dark: open ⋮ → Settings → Theme")
page = st.sidebar.radio("Navigate", ["Overview", "Performance", "Volume", "Data"])


def chart(fig):
    fig.update_layout(height=420, margin=dict(l=0, r=10, t=20, b=0),
                      legend=dict(orientation="h", y=1.12),
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
    st.plotly_chart(fig, width="stretch", theme="streamlit")


def app():
    with connect() as conn:
        bounds = query(conn, "SELECT MIN(date) AS first,MAX(date) AS last FROM daily_prices")
        if bounds.iloc[0]["first"] is None:
            st.info("No prices yet. Run python main.py, then refresh this page.")
            return
        source = query(conn, "SELECT source FROM dataset_metadata").iloc[0, 0]
        if source == "SYNTHETIC DEMO":
            st.warning("SYNTHETIC DEMO — generated prices, not real market data.")
        first, last = bounds.iloc[0]
        st.caption(f"Source: {source} · Last stored session: {last}")
        choices = query(conn, "SELECT symbol FROM stocks ORDER BY symbol").symbol.tolist()
        symbol = st.sidebar.selectbox("Stock", choices)
        dates = st.sidebar.date_input("Period", (max(first, last - timedelta(days=365)), last),
                                      min_value=first, max_value=last)
        if len(dates) != 2:
            st.info("Select a start and end date.")
            return
        start, end = dates
        selected = st.sidebar.multiselect("Compare", choices, default=choices)
        prices = history(conn, [symbol], start, end)
        if prices.empty:
            st.info("No data available for the selected date range.")
            return
        summary = period_summary(conn, [symbol], start, end).iloc[0]
        if page == "Overview":
            cols = st.columns(4)
            change = summary.daily_change
            cols[0].metric(f"{symbol} close", f"${summary.latest_price:,.2f}",
                           None if pd.isna(change) else f"{change:.2%}")
            cols[1].metric("Period price return", f"{summary.period_return:.2%}")
            cols[2].metric("Average volume", f"{summary.average_volume/1e6:.2f}M")
            cols[3].metric("Sessions", len(prices))
            chart(px.line(prices, x="date", y=["close_price", "ma_7", "ma_30"],
                          labels={"value": "USD", "date": "", "variable": "Series"}))
            st.caption("MA windows use 7 and 30 trading sessions. Incomplete windows are blank. Returns exclude dividends.")
            with st.expander("Daily risk measures"):
                chart(px.line(prices, x="date", y="volatility_30", labels={"volatility_30": "30-session return standard deviation"}))
                st.caption("Unannualized sample standard deviation; a daily-frequency volatility estimate.")
        elif page == "Performance":
            if not selected:
                st.info("Choose stocks in Compare.")
                return
            compared = comparison(conn, selected, start, end)
            if compared.empty:
                st.info("No common trading sessions for this selection.")
                return
            chart(px.line(compared, x="date", y="cumulative_return", color="symbol",
                          labels={"cumulative_return": "Price return", "date": ""}).update_yaxes(tickformat=".0%"))
            common_start, common_end = compared.date.min(), compared.date.max()
            movers = period_summary(conn, selected, common_start, common_end)
            a, b, c = st.columns(3)
            best = movers.loc[movers.period_return.idxmax()]
            worst = movers.loc[movers.period_return.idxmin()]
            busy = movers.loc[movers.latest_volume.idxmax()]
            a.metric("Best period performer", best.symbol, f"{best.period_return:.2%}")
            b.metric("Worst period performer", worst.symbol, f"{worst.period_return:.2%}")
            c.metric("Highest latest-session volume", busy.symbol, f"{busy.latest_volume/1e6:.2f}M", delta_color="off")
            st.caption(f"Shared sessions: {common_start} to {common_end}. All lines start at 0%.")
            st.dataframe(movers, hide_index=True, width="stretch")
        elif page == "Volume":
            chart(px.bar(prices, x="date", y="volume", labels={"date": "", "volume": "Shares"}))
            peak = prices.loc[prices.volume.idxmax()]
            st.caption(f"Highest-volume selected session: {peak.date} · {peak.volume:,} shares")
        else:
            st.dataframe(prices, hide_index=True, width="stretch")
            st.download_button("Download selected data", prices.to_csv(index=False),
                               f"{symbol}_prices.csv", "text/csv")
            st.subheader("All-history SQL summary")
            st.dataframe(query(conn, "SELECT * FROM stock_summary WHERE symbol=%s", (symbol,)), hide_index=True)
            st.subheader("Monthly close-to-close returns")
            st.caption("First available month has no prior close; the latest month may be incomplete.")
            st.dataframe(query(conn, "SELECT * FROM monthly_returns WHERE symbol=%s ORDER BY month DESC", (symbol,)), hide_index=True)
            st.subheader("Pipeline runs")
            st.dataframe(query(conn, "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 10"), hide_index=True)


try:
    app()
except Exception as exc:
    logging.getLogger(__name__).error("Dashboard load failed (%s)", type(exc).__name__)
    st.error("Unable to load market data. Check that PostgreSQL is running and run python main.py --init-db, then refresh.")
