# Connect Neon PostgreSQL without sharing secrets

## 1. Create the free database

Visit https://neon.com and sign up. Create a project named `data-platform` on the **Free** plan. Keep the default PostgreSQL database (`neondb`) and role, or choose your own. You do not need to provide a credit card or activate a paid trial.

Open the project's **Connect** dialog. Select your database and role, and turn **Connection pooling OFF**. Copy the PostgreSQL connection string. Keep its `sslmode=require` parameter (and `channel_binding=require` if present).

Why a direct URL: the Python loader uses a PostgreSQL session advisory lock to prevent overlapping jobs while committing each stock separately. A transaction-pooled connection cannot preserve that session lock across commits. The Neon HTTP API also accepts this direct URL, so one URL can serve both paths.

## 2. Configure your local .env

From the project root, copy `.env.example` to `.env`. PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Add your copied URL using this format; the values here are **placeholders only**:

```dotenv
DATABASE_URL=postgresql://YOUR_ROLE:YOUR_PASSWORD@YOUR_DIRECT_ENDPOINT.neon.tech/neondb?sslmode=require
DEMO_MODE=false
```

The endpoint must not contain `-pooler`. Paste the provider's URL exactly; passwords with special characters must remain URL-encoded as supplied by Neon. Quotes are not required for a normal Neon URL. Leave `.env` at the project root. You can retain the local `POSTGRES_*` variables; `DATABASE_URL` takes precedence.

`DATABASE_URL` authenticates the server and ingestion process to PostgreSQL. `DEMO_MODE` is not a secret: `true` explicitly selects synthetic data in the React API, and `false` selects the database. Python ingestion uses `--demo` only when explicitly requested and does not read `DEMO_MODE`.

Never commit `.env` to GitHub, put credentials into source files, or paste them into chat. `git check-ignore .env` should print `.env`. Never name this variable `VITE_DATABASE_URL`: `VITE_*` variables are public client build variables.

## 3. Verify without displaying the password

Create a Python environment and install the pipeline dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-pipeline.txt
.\.venv\Scripts\python.exe main.py --check-config
.\.venv\Scripts\python.exe main.py --init-db
.\.venv\Scripts\python.exe main.py
```

Expected: configuration loaded (password hidden), database schema ready, and one retrieval/upsert result per configured stock. Provider failures are logged; a partial/failed run returns exit code 1. A successful connection does not guarantee Yahoo access from your network.

Alternatively, use the GitHub workflow in step 5 to initialize and ingest; no local Python installation is then necessary.

## 4. Configure Vercel

Open your **data-platform** project → **Settings → Environment Variables**:

| Name | Value | Environments |
|---|---|---|
| `DATABASE_URL` | Your direct Neon connection URL | Production and Preview |
| `DEMO_MODE` | `false` | Production and Preview |

Save, then **Deployments → latest deployment → Redeploy**. Use Vercel's secret/sensitive setting for `DATABASE_URL` where available. Never send the URL to visitors or expose it through client-side environment variables.

If ingestion has not populated tables yet, finish step 3 or 5 first. Check the Data view for pipeline runs and actual stored prices. The synthetic banner should disappear only when the database contains real data. If the database contains an explicitly loaded Python demo, the banner correctly remains.

To explore the site before creating Neon, configure only `DEMO_MODE=true` and redeploy. This is an explicit demo configuration, not a silent fallback. For a live configuration, a missing/broken database displays a friendly error.

## 5. Enable free daily ingestion

In GitHub open **Gurkamalvirk/Data-platform → Settings → Secrets and variables → Actions → New repository secret**:

- Name: `DATABASE_URL`
- Secret: the same direct Neon URL.

Then open **Actions → Daily market ingestion → Run workflow** on `main`.

After success, future daily runs use the secret at 03:00 UTC (08:30 IST). Sunday runs refresh full history to catch older provider corrections. Standard hosted runners on this public repository are free. Keep the runner standard and the repository public to retain that billing model. No raw data artifacts are uploaded.

If the job fails, look at which phase failed: configuration, connection, or provider retrieval. Do not paste your secret into logs. The workflow skips with a visible configuration message while no secret is set. Scheduled workflows can be delayed or disabled after prolonged repository inactivity; the Actions tab shows their state.

## 6. Stay at ₹0

Keep Vercel on Hobby (personal use), Neon on Free, and standard GitHub Actions runners in the public repository. Do not enable paid add-ons or upgrade plans. The API caches responses for five minutes and bounds its dataset size, but free-tier quotas still apply; services may pause when exhausted. Read provider dashboards for current quota usage. There is no automatic paid fallback.
