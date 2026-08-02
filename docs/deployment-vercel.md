# Vercel Deployment Setup

> **Environment:** STAGING + PRODUCTION
> **Stack:** Next.js 14 (web) + Express 4 (API)
> **Monorepo:** pnpm workspaces `apps/web`, `apps/api`, `packages/shared`
> **CI/CD:** CircleCI deploys to Vercel

This guide walks through setting up **four Vercel projects** — two per environment — for the Handmade Shop monorepo.

---

## 1. Architecture Overview

We deploy **two separate Vercel projects** per environment because the web (Next.js) and API (Express) are independent apps with different build commands, environment variables, and lifecycles.

| Environment    | Vercel Project              | App              | Root Directory | Framework |
| -------------- | --------------------------- | ---------------- | -------------- | --------- |
| **STAGING**    | `handmade-shop-web-staging` | Next.js frontend | `apps/web`     | Next.js   |
| **STAGING**    | `handmade-shop-api-staging` | Express API      | `apps/api`     | Express   |
| **PRODUCTION** | `handmade-shop-web-prod`    | Next.js frontend | `apps/web`     | Next.js   |
| **PRODUCTION** | `handmade-shop-api-prod`    | Express API      | `apps/api`     | Express   |

### URL Structure

```
STAGING Web:    https://handmade-shop-web-staging.vercel.app
STAGING API:    https://handmade-shop-api-staging.vercel.app

PRODUCTION Web:  https://handmade-shop-web-prod.vercel.app   →  custom domain
PRODUCTION API:  https://handmade-shop-api-prod.vercel.app   →  custom domain
```

The Next.js frontend's `NEXT_PUBLIC_API_URL` points to the API project's URL for each environment.

---

## 2. Prerequisites

Before starting, ensure you have:

| Requirement        | Check                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| **Vercel account** | [vercel.com/signup](https://vercel.com/signup) — free tier is sufficient |
| **Vercel CLI**     | `npm install -g vercel@latest`                                           |
| **GitHub repo**    | Your monorepo pushed to GitHub                                           |
| **Node.js**        | `>=20` (matches project's `package.json` engine)                         |
| **pnpm**           | `>=9` (`npm install -g pnpm@9`)                                          |

---

## 3. Step-by-Step: Create Projects via Vercel Dashboard

### 3.1 Create the Production Web Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → **Add New** → **Project**.
2. **Import Git Repository** → select your GitHub repo.
3. Configure the project:

   | Setting              | Value                                              |
   | -------------------- | -------------------------------------------------- |
   | **Project Name**     | `handmade-shop-web-prod`                           |
   | **Framework Preset** | `Next.js`                                          |
   | **Root Directory**   | `apps/web` (click **Edit** → select from dropdown) |
   | **Build Command**    | _(leave blank — Vercel auto-detects Next.js)_      |
   | **Output Directory** | _(leave blank — Next.js auto-detects `.next`)_     |
   | **Install Command**  | _(leave blank — Vercel auto-detects pnpm)_         |

4. **Environment Variables** — skip for now (we'll add them in Section 5).
5. Click **Deploy**.

Vercel will run an initial deployment. It may fail because the shared package isn't built yet — that's expected. We'll fix the build settings in Section 4.

### 3.2 Create the Production API Project

The API project gets its build configuration from `apps/api/vercel.json` (already committed to the repo). When importing, Vercel **automatically detects** this file and applies its settings — no manual entry needed.

1. **Add New** → **Project** → same GitHub repo.
2. Configure:

   | Setting              | Value                                               |
   | -------------------- | --------------------------------------------------- |
   | **Project Name**     | `handmade-shop-api-prod`                            |
   | **Framework Preset** | `Other`                                             |
   | **Root Directory**   | `apps/api`                                          |
   | **Build Command**    | _(leave blank — managed by `apps/api/vercel.json`)_ |
   | **Output Directory** | _(leave blank — managed by `apps/api/vercel.json`)_ |
   | **Install Command**  | _(leave blank — managed by `apps/api/vercel.json`)_ |

   > **Why leave these blank?** The file `apps/api/vercel.json` already defines `buildCommand: "cd ../.. && pnpm --filter @handmade-shop/shared build && pnpm --filter @handmade-shop/api prisma:generate"` and `installCommand: "cd ../.. && pnpm install --frozen-lockfile"`. When Vercel imports the project and detects `vercel.json`, it reads these settings automatically. Overriding them in the Dashboard would create drift between the committed config and the dashboard config.
   >
   > **Why `cd ../..`?** Vercel treats `apps/api` as the project root. The lockfile and workspace config are at the monorepo root, so we navigate up two levels to access them.
   >
   > **Why no build step for the API itself?** Vercel's Express framework preset (`"framework": "express"` in `apps/api/vercel.json`) bundles the app exported from `src/index.ts` into a single serverless function at deploy time. The TypeScript build (`tsc`) is not needed.

3. **Environment Variables** — add now (these are critical):

   | Name | Value | Scope |
   | ---- | ----- | ----- |

| `DATABASE_URL` | _(your production PostgreSQL pooled URL)_ | Production |
| `JWT_SECRET` | _(random 64-char string)_ | Production |
| `JWT_EXPIRES_IN` | `7d` | Production |

4. Click **Deploy**.
5. After deployment, note the **Vercel URL** (e.g., `https://handmade-shop-api-prod.vercel.app`). You'll need this for the web project's env vars.

### 3.3 Create the Staging Projects

Repeat steps 3.1 and 3.2 for the staging environment:

| Project | Name                        | Root Dir   | Framework |
| ------- | --------------------------- | ---------- | --------- |
| Web     | `handmade-shop-web-staging` | `apps/web` | Next.js   |
| API     | `handmade-shop-api-staging` | `apps/api` | Express   |

Use the same build/install commands as their production counterparts, but with **staging** environment variables:

| Name             | Value                             | Scope                |
| ---------------- | --------------------------------- | -------------------- |
| `DATABASE_URL`   | _(staging PostgreSQL pooled URL)_ | Preview + Production |
| `JWT_SECRET`     | _(can be different from prod)_    | Preview + Production |
| `JWT_EXPIRES_IN` | `7d`                              | Preview + Production |

> **Tip:** Set env vars with scope **Preview** (for branch deployments) and **Production** (for main/staging branch deployments). For our CircleCI-based workflow, we primarily need **Production** scope.

### 3.4 Result: Project Overview

After creation, your Vercel dashboard should show:

```
~/handmade-shop-web-prod      (Production - Web)
~/handmade-shop-api-prod      (Production - API)
~/handmade-shop-web-staging   (Staging - Web)
~/handmade-shop-api-staging   (Staging - API)
```

---

## 4. Advanced: Build & Output Settings

### 4.1 Web (Next.js) — Build Optimization

The Next.js app transpiles `@handmade-shop/shared` via its `next.config.js`. No extra Vercel configuration is needed for the web project — Vercel auto-detects Next.js and handles the build.

Optional optimization — enable **Incremental Static Regeneration (ISR)** and configure caching in `vercel.json` at the project root (or at `apps/web/vercel.json`):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    }
  ]
}
```

> Note: This is optional and not required for initial setup.

### 4.2 API (Express) — Serverless Function Config

The API's build settings are defined in `apps/api/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm --filter @handmade-shop/shared build && pnpm --filter @handmade-shop/api prisma:generate",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "express",
  "regions": ["hnd1"]
}
```

**Key points:**

- `framework: "express"` — uses Vercel's built-in Express preset: the app exported from `src/index.ts` becomes a **single serverless function** with automatic routing to all paths (no `rewrites` needed). This overrides the "Other" (static) preset, which would otherwise demand an output directory (default `public`) and fail the build with `No Output Directory named "public" found`.
- `regions: ["hnd1"]` — pins the serverless function to **Tokyo** (Vercel region `hnd1`), matching the Supabase database region (`ap-northeast-1`). Without this, the function runs in `iad1` (US East) by default and every DB query crosses the Pacific (~200 ms round-trip each). If you change the database region, update this to the matching Vercel region (e.g. `sin1` Singapore, `iad1` US East, `sfo1` San Francisco).
- **No `rewrites`, `functions`, or `outputDirectory` needed** — the Express preset handles routing, function limits (configure memory/max duration in the Dashboard → Functions), and does not require any static output.
- The `installCommand` and `buildCommand` both navigate to the monorepo root via `cd ../..`. The buildCommand generates Prisma Client and builds the shared package before the function is bundled.
- **Do NOT add `outputDirectory`** — it makes Vercel treat the deployment as pre-built static files and skip compiling the function entirely (the API then returns raw TypeScript source, HTTP 200).

> ⚠️ The `vercel.json` file is already committed to the repo. When Vercel imports the project (Section 3.2), it automatically picks up these settings. **Do not override the Build Command or Install Command in the Dashboard** — let `vercel.json` manage them to avoid config drift.

---

## 5. Environment Variables

### 5.1 Per-Project Environment Variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

#### Web (Both Environments)

| Name                  | Value                                  | Scope                                            | Notes                                                                                                                                              |
| --------------------- | -------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://<api-project>.vercel.app/api` | Production (or Preview + Production for staging) | Points to the API project's base URL. Inlined at **build time** by Next.js, so must be available during `next build`. See §7.2 for CircleCI setup. |

#### API — Staging

| Name             | Value                                                | Scope                |
| ---------------- | ---------------------------------------------------- | -------------------- |
| `DATABASE_URL`   | `postgresql://...?pgbouncer=true&connect_timeout=15` | Preview + Production |
| `JWT_SECRET`     | _(random 64-char string)_                            | Preview + Production |
| `JWT_EXPIRES_IN` | `7d`                                                 | Preview + Production |

#### API — Production

| Name             | Value                                                | Scope      |
| ---------------- | ---------------------------------------------------- | ---------- |
| `DATABASE_URL`   | `postgresql://...?pgbouncer=true&connect_timeout=15` | Production |
| `JWT_SECRET`     | _(different from staging!)_                          | Production |
| `JWT_EXPIRES_IN` | `7d`                                                 | Production |

### 5.2 Setting Variables via CLI (Alternative)

Instead of the Dashboard, you can use the CLI:

```bash
# Switch to the project directory
cd apps/api

# Link to the staging API project
vercel link

# Add environment variable
vercel env add DATABASE_URL production
# Paste the value and press Enter

# Add JWT_SECRET
vercel env add JWT_SECRET production
# Paste the value

# Pull env vars to local .env
vercel env pull .env.production
```

> **Note:** `vercel link` must be run from within the project directory (e.g., `apps/api` for the API project). It creates a `.vercel/project.json` file that stores the project ID and org ID.

### 5.3 Sensitive vs. Plaintext Variables

- **Sensitive** (masked in logs): `DATABASE_URL`, `JWT_SECRET`
- **Plaintext** (visible in logs): `NEXT_PUBLIC_API_URL`, `JWT_EXPIRES_IN`

Vercel treats any variable prefixed with `NEXT_PUBLIC_` as plaintext. For all other variables, they are **encrypted at rest and masked in logs**.

---

## 6. Git Integration

### 6.1 Production Branches

By default, Vercel auto-deploys:

- **`main` branch** → **Production** environment
- **All other branches** → **Preview** deployments (with unique URLs)

For our setup, we **disable** Vercel's Git auto-deployment because CircleCI handles deployments. To do this:

1. Go to **Project Settings → Git**.
2. Under **Production Branch**, keep it as `main` (for display only).
3. Under **Auto-deployments**, uncheck **"Deploy on every push to any branch"**.
4. Keep **"Deploy on every push to the production branch"** unchecked.

This prevents Vercel from deploying twice (once from Vercel's own integration, once from CircleCI).

> **Alternative:** You can keep Vercel auto-deployments enabled and skip the CircleCI deploy steps. However, using CircleCI gives you **test-before-deploy** guarantees, which Vercel's auto-deploy doesn't provide.

### 6.2 Related Projects (API URL for Preview Deployments)

Vercel's **Related Projects** feature lets your Next.js app automatically discover the API URL for preview deployments:

1. Go to your **Web project** → **Settings** → **Related Projects**.
2. Click **Add Related Project** → select your **API project**.
3. Now, during preview deployments, Vercel injects a `VERCEL_API_URL` environment variable (or similar) automatically.

> **Note:** Related Projects is available on Vercel Pro plan or higher. On the free plan, manually set `NEXT_PUBLIC_API_URL` per deployment.

---

## 7. CircleCI Integration

The CircleCI pipeline (`deploy-staging` and `deploy-production` workflows) deploys to Vercel programmatically using the Vercel CLI. For this to work, you need to provide Vercel project IDs to the CircleCI environment.

### 7.1 Finding Project IDs

After linking a project locally, the project ID and org ID are stored in:

```bash
cat .vercel/project.json
# Output: {"projectId":"prj_xxxxxxxxxxxxxxxxxxxxxxxx","orgId":"team_xxxxxxxxxxxxxxxxxxxxxxxx"}
```

### 7.2 Required CircleCI Environment Variables

Set these in **CircleCI Dashboard → Project → Environment Variables**:

| Variable                        | Source                                          | Example                                            |
| ------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| `VERCEL_TOKEN`                  | Vercel Account → Settings → Tokens              | _(create a token with full scope)_                 |
| `VERCEL_ORG_ID`                 | `.vercel/project.json` → `orgId`                | `team_xxxxxxxxxxxxxxxxxxxxxxxx`                    |
| `VERCEL_PROJECT_ID_WEB_STAGING` | Staging Web project → `.vercel/project.json`    | `prj_xxxxxxxxxxxxxxxxxxxxxxxx`                     |
| `VERCEL_PROJECT_ID_WEB_PROD`    | Production Web project → `.vercel/project.json` | `prj_xxxxxxxxxxxxxxxxxxxxxxxx`                     |
| `VERCEL_PROJECT_ID_API_STAGING` | Staging API project → `.vercel/project.json`    | `prj_xxxxxxxxxxxxxxxxxxxxxxxx`                     |
| `VERCEL_PROJECT_ID_API_PROD`    | Production API project → `.vercel/project.json` | `prj_xxxxxxxxxxxxxxxxxxxxxxxx`                     |
| `DATABASE_URL_STAGING`          | Your staging PostgreSQL URL                     | `postgresql://...?pgbouncer=true`                  |
| `DATABASE_URL_PROD`             | Your production PostgreSQL URL                  | `postgresql://...?pgbouncer=true`                  |
| `NEXT_PUBLIC_API_URL_STAGING`   | Staging API project's deployed URL + `/api`     | `https://handmade-shop-api-staging.vercel.app/api` |
| `NEXT_PUBLIC_API_URL_PROD`      | Production API project's deployed URL + `/api`  | `https://handmade-shop-api-prod.vercel.app/api`    |

> **How these map in CircleCI:** The CircleCI pipeline's `environment` blocks map these suffixes to the plain variable names:
>
> - Staging job: `NEXT_PUBLIC_API_URL: "${NEXT_PUBLIC_API_URL_STAGING}"`, `DATABASE_URL: "${DATABASE_URL_STAGING}"`
> - Production job: `NEXT_PUBLIC_API_URL: "${NEXT_PUBLIC_API_URL_PROD}"`, `DATABASE_URL: "${DATABASE_URL_PROD}"`
>
> This is configured in the `build-and-deploy-staging` and `build-and-deploy-production` jobs in `.circleci/config.yml`. You don't need to add `NEXT_PUBLIC_API_URL` or `DATABASE_URL` separately in CircleCI — only the `_STAGING`/`_PROD` suffixed versions above.

### 7.3 How the Deploy Step Works

The CircleCI `deploy-vercel` command:

```yaml
commands:
  deploy-vercel:
    parameters:
      app-dir: # e.g., "apps/web" or "apps/api"
      project-id-env: # e.g., "VERCEL_PROJECT_ID_WEB_STAGING"
    steps:
      - run:
          command: |
            # MUST run from the monorepo root, NOT from inside the app dir: the
            # Vercel CLI resolves the project's Root Directory (apps/web or
            # apps/api) relative to cwd, so deploying from inside the app dir
            # doubles the path and fails with "The provided path .../apps/web/
            # apps/web does not exist".
            mkdir -p .vercel
            echo "{\"projectId\":\"${<< parameters.project-id-env >>}\",\"orgId\":\"${VERCEL_ORG_ID}\"}" > .vercel/project.json
            # Vercel CLI v58 checks VERCEL_ORG_ID/VERCEL_PROJECT_ID env vars BEFORE
            # reading .vercel/project.json: if VERCEL_ORG_ID is set without
            # VERCEL_PROJECT_ID it aborts with "You specified `VERCEL_ORG_ID` but you
            # forgot to specify `VERCEL_PROJECT_ID`". Export both to target the project.
            export VERCEL_PROJECT_ID="${<< parameters.project-id-env >>}"
            npx vercel deploy --prod --token=$VERCEL_TOKEN --yes
```

This:

1. Runs from the monorepo root (the CircleCI `working_directory: ~/project`) so the CLI can resolve the project's Root Directory (`apps/web` or `apps/api`) against the local checkout.
2. Creates a `.vercel/project.json` with the correct project and org IDs (fallback link).
3. Exports `VERCEL_PROJECT_ID` (alongside the already-set `VERCEL_ORG_ID`) so the CLI targets the intended project — this works around a v58 CLI check that rejects `VERCEL_ORG_ID` without `VERCEL_PROJECT_ID` before it even reads `project.json`.
4. Runs `vercel deploy --prod` to deploy. The CLI uploads the monorepo (root lockfile and `packages/shared` included) while Vercel builds from the Root Directory — which is why the `cd ../..` commands in the committed `vercel.json` files work.

> **`--prod`** flag deploys to the Production environment (the `main` branch in Vercel's terms). For staging, the `staging` branch still uses `--prod` because we want it to replace the staging project's current production deployment.
>
> **`--yes`** flag skips interactive prompts (required for CI).

---

## 8. Custom Domains

### 8.1 Web (Next.js)

1. Go to **Vercel Dashboard → Web Production Project → Settings → Domains**.
2. Enter your custom domain: e.g., `app.handmadeshop.com`.
3. Follow the DNS instructions:
   - **Option A (Vercel DNS):** Transfer nameservers to Vercel.
   - **Option B (External DNS):** Add a `CNAME` record pointing `app` → `cname.vercel-dns.com`.

### 8.2 API (Express)

1. Go to **API Production Project → Settings → Domains**.
2. Enter a subdomain: e.g., `api.handmadeshop.com`.
3. Add a `CNAME` record pointing `api` → `cname.vercel-dns.com`.

### 8.3 Update env vars after domain setup

After adding custom domains, update:

- **API Project → Environment Variables:**
  - `JWT_EXPIRES_IN` → `7d` (no change needed)
- **Web Project → Environment Variables:**
  - `NEXT_PUBLIC_API_URL` → `https://api.handmadeshop.com/api`

---

## 9. Monitoring & Logs

### 9.1 Vercel Dashboard

Each project has built-in monitoring:

| Feature            | Location                 | What you see                     |
| ------------------ | ------------------------ | -------------------------------- |
| **Deployments**    | Dashboard → Deployments  | History, status, commit messages |
| **Logs**           | Project → Logs           | Real-time and historical logs    |
| **Analytics**      | Project → Analytics      | Visitor stats (web only)         |
| **Speed Insights** | Project → Speed Insights | Core Web Vitals (web only)       |
| **Edge Functions** | Project → Edge Functions | Invocations, duration, errors    |

### 9.2 Vercel CLI for Logs

```bash
# Tail logs for the production API
cd apps/api
vercel logs --token=$VERCEL_TOKEN

# View specific deployment logs
vercel logs --token=$VERCEL_TOKEN <deployment-url>
```

### 9.3 Alert Notifications

Set up deployment notifications:

1. **Project Settings → Notifications**.
2. Add **Slack webhook** or **email** for:
   - Deployment ready
   - Deployment error
   - Production deployment

---

## 10. Deployment Workflow (End-to-End)

### First-Time Deploy

```bash
# 1. Create 4 Vercel projects (Section 3)
# 2. Set environment variables (Section 5)
# 3. Link projects locally & get project IDs (Section 7.1)
cd apps/web && vercel link --project handmade-shop-web-prod
cat .vercel/project.json  # copy projectId + orgId
cd ../..

cd apps/api && vercel link --project handmade-shop-api-prod
cat .vercel/project.json  # copy projectId
cd ../..

# 4. Set CircleCI env vars (Section 7.2)
# 5. Push to staging
git checkout -b staging
git push origin staging
# → CircleCI runs: test → build → deploy to staging Vercel projects

# 6. Verify staging deployment
# 7. Merge to main
git checkout main
git merge staging
git push origin main
# → CircleCI runs: build → deploy to production Vercel projects

# 8. Run production DB migration manually
export DATABASE_URL="$(grep '^DATABASE_URL=' .env.production | sed 's/^DATABASE_URL=//')"
pnpm --filter @handmade-shop/api prisma migrate deploy
```

### Daily Workflow

```bash
# 1. Develop on feature branch
git checkout -b feature/add-reporting

# 2. Push → CircleCI runs tests only
git push origin feature/add-reporting

# 3. Merge to staging → deploy to staging
git checkout staging
git merge feature/add-reporting
git push origin staging

# 4. Test on staging URLs
# 5. Merge to main → deploy to production
git checkout main
git merge staging
git push origin main
```

---

## 11. Troubleshooting

### Deploy fails with "No matching framework detected"

**Problem:** Vercel can't detect the framework for the API project.
**Fix:** Ensure `apps/api/vercel.json` sets `"framework": "express"` (this also fixes the `No Output Directory named "public" found` error, which comes from the "Other"/static preset). Also verify the `installCommand` and `buildCommand` correctly navigate to the monorepo root with `cd ../..`.

### "Module not found: @handmade-shop/shared"

**Problem:** The shared package isn't built before deployment.
**Fix:** The `buildCommand` in `apps/api/vercel.json` includes `pnpm --filter @handmade-shop/shared build`. Verify it's set correctly. For the web project, the `transpilePackages` in `next.config.js` handles this at build time.

### "Environment variables not available at build time"

**Problem:** `DATABASE_URL` is not set when Prisma Client generates during build.
**Fix:** Ensure the environment variable is:

1. Set in Vercel Dashboard with scope **Production** (not just Preview).
2. For CircleCI builds, it's set as a CircleCI project environment variable (`DATABASE_URL_STAGING`/`DATABASE_URL_PROD`), which the CircleCI config maps to `DATABASE_URL` via the `environment` block in the job.

### "Deploy successful but 404 on all routes" (API)

**Problem:** The Express app isn't handling requests.
**Fix:**

1. Verify `apps/api/src/index.ts` exports the Express app as the default export.
2. Verify `apps/api/vercel.json` has `"framework": "express"` so all routes are automatically routed to the app (a single Vercel Function).
3. Check the function logs in Vercel Dashboard → API Project → Logs.

### "Deploy failed: Build exceeded serverless function limit"

**Problem:** The Express API bundle is too large for a serverless function (50 MB limit).
**Fix:**

1. Ensure `node_modules` for serverless functions only includes production dependencies.
2. The `installCommand` already uses `--frozen-lockfile` which helps. Add a `.vercelignore` or use the `includeFiles`/`excludeFiles` in `vercel.json` if needed.

### "CircleCI deploy step hangs"

**Problem:** `vercel deploy` prompts for input even with `--yes` flag.
**Fix:** Ensure:

1. `--yes` flag is present.
2. The project is already linked via `.vercel/project.json`.
3. The `VERCEL_TOKEN` is valid and has correct scope.
4. The `orgId` in `.vercel/project.json` matches the token's owner/team.

### "CORS errors between web and API on different domains"

**Problem:** The Next.js frontend (on `vercel.app` or custom domain) can't call the API (on a different domain).
**Fix:** The API already has `cors()` middleware enabled in `apps/api/src/index.ts`. For production, ensure:

1. CORS is configured to allow your web domain (add explicit origin if needed).
2. Credentials are handled if using cookies.
3. See `apps/api/src/index.ts` for the existing CORS configuration.

---

## 12. Cost Estimation

| Environment    | Project | Vercel Plan  | Estimated Monthly Cost |
| -------------- | ------- | ------------ | ---------------------- |
| **Staging**    | Web     | Hobby (free) | $0                     |
| **Staging**    | API     | Hobby (free) | $0                     |
| **Production** | Web     | Pro ($20/mo) | $20                    |
| **Production** | API     | Pro ($20/mo) | $20                    |
| **Total**      |         |              | **$40/month**          |

> **Hobby Plan limits:** 100 GB bandwidth, 60 serverless function invocations per minute, 10-day log retention.
> **Pro Plan needed** for: custom domains, unlimited team members, 400 GB bandwidth, 300 serverless invocations/min, and premium support.

The staging projects can remain on the **Hobby (free) plan** indefinitely.

---

## 13. Security Checklist

- [ ] **Vercel tokens** stored only in CircleCI, never in code.
- [ ] **Production and staging** use different Vercel projects (full isolation).
- [ ] **Environment variables** use **Sensitive** masking for secrets.
- [ ] **Preview deployments** disabled for public repos (or use `vercel.json` → `"trailingSlash": false` to prevent exposing staging).
- [ ] **Password protection** enabled on staging projects if they're publicly accessible:
      Project Settings → Password Protection → Enable.
- [ ] **Custom domains** use HTTPS (Vercel auto-provisions SSL).
- [ ] **CORS** restricted to the specific web domain in production API.
- [ ] **Prisma connection pooling** enabled (`?pgbouncer=true`) for all serverless connections.
- [ ] **Automatic CDN caching** considered — disable for authenticated API routes via `Cache-Control: no-cache` headers.
