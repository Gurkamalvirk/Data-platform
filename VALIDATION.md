# Validation report — 10 September 2026

## Verified locally

- React/Vite production build completes.
- Six JavaScript tests pass: shared-date rebasing, empty selections, period returns, CSV output, deterministic labelled demo, complete MA windows, explicit demo mode, and rejection of public writes.
- Python: **18 passed, 2 skipped**. Includes transformation, duplicate auditing, retries, shared configuration and direct/TLS Neon URL validation.
- Original Streamlit: all four views were checked using synthetic query fixtures during the initial implementation.

- Local HTTP API smoke check passed: 3,480 synthetic records for five configured stocks; POST requests return 405.

## External checks and limits

- The two real-PostgreSQL integration tests require a database; no local Docker/PostgreSQL server is available here.
- No Neon database credential has been supplied. Live database reads, migrations and scheduled ingestion must be verified after following docs/NEON_SETUP.md.
- Yahoo's earlier live fetch was rate-limited/timed out. Successful live ingestion is not claimed.
- Production Vercel deployment reached READY at https://data-platform-peach.vercel.app/.
- The live API returned HTTP 200 with 3,480 explicitly synthetic records across five stocks.
- Cloud browser verification: dark Overview screenshot inspected; Light theme selected successfully and the Performance view rendered the five comparison series and period rankings.
- Vercel runtime error check reported no errors in the final 15-minute inspection window. This is a point-in-time check, not continuous monitoring.
- Mobile/browser CSV download interaction and real Neon execution have not been verified.
- React demo mode is explicitly selected by config/dashboard.json; DEMO_MODE=false selects the live database. No configured live database failure silently switches to demo prices.

Follow the README to verify locally, and confirm a successful Actions ingestion run before using the hosted site with DEMO_MODE=false.
