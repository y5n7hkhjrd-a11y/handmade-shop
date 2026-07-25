# Database Provisioning & Configuration

> **Environment:** STAGING + PRODUCTION
> **Stack:** PostgreSQL 16 via Prisma ORM
> **CI/CD:** CircleCI (deploys to Vercel)

This guide covers how to provision, configure, and maintain two PostgreSQL databases — one for **STAGING** and one for **PRODUCTION** — for the Handmade Shop application.

---

## 1. Provider Options

| Provider     | Best For                                 | Free Tier (Staging)          | Production Pricing              | Branching                |
| ------------ | ---------------------------------------- | ---------------------------- | ------------------------------- | ------------------------ |
| **Neon** ⭐  | Serverless, branching, scale-to-zero     | 0.5 GB storage, branch limit | ~$19/mo for 10 GB, 100M compute | ✅ Instant copy-on-write |
| **Supabase** | Batteries-included (Auth + DB + Storage) | 500 MB, 2 projects           | ~$25/mo for 8 GB                | ✅ Database branching    |
| **Railway**  | All-in-one PaaS, private networking      | $5 credit/month              | $5–$20/mo depending on RAM      | ❌ Manual DB copy        |
| **Render**   | Predictable instance pricing             | 90-day trial, 1 GB RAM       | $7–$15/mo per DB                | ❌ Manual DB copy        |

**⭐ Recommendation:** Use **Neon** for its instant branching (perfect for staging/CI) and scale-to-zero pricing. It also has the best Prisma/Serverless integration for Vercel.

### Fallback Options

- **Supabase** — if you want integrated Auth + Storage down the line.
- **Railway** — if you want the database on the same private network as the API.
- **Self-hosted** — spin up PostgreSQL on a cheap VPS (e.g., $5/mo Hetzner). Requires manual maintenance.

---

## 2. Provisioning — Neon (Primary Recommendation)

### 2.1 Create an Account

1. Visit [neon.tech](https://neon.tech) and sign up.
2. Create a new project: **Handmade Shop**
   - Region: Pick the region closest to your Vercel deployment (e.g., `us-east-1`)
   - PostgreSQL version: **16**
3. Once created, note your **connection strings** from the dashboard.

### 2.2 Create Two Databases

Neon projects contain one "main" database by default. Since we need separate staging and production databases, the cleanest approach is:

#### Option A: Two Neon Projects (Recommended for full isolation)

| Environment | Neon Project            | Database           |
| ----------- | ----------------------- | ------------------ |
| STAGING     | `handmade-shop-staging` | `neondb` (default) |
| PRODUCTION  | `handmade-shop-prod`    | `neondb` (default) |

#### Option B: One Project with Branching (Cheaper, uses Neon's superpower)

| Branch    | Purpose                  |
| --------- | ------------------------ |
| `main`    | PRODUCTION               |
| `staging` | STAGING (branch of prod) |

1. In your Neon project, create a branch called `staging` from `main`.
2. Each branch gets its own connection string.

**Why branching is powerful:**

- Test schema migrations on staging before running on prod.
- Spin up ephemeral branches for CI/CD pull requests.
- Branches share storage until data diverges (very cost-effective).

### 2.3 Connection Strings

From the Neon dashboard, copy the **connection strings**. They look like:

```
# PRISMA connection (uses connection pooler — recommended for Vercel)
postgresql://user:password@ep-example-123456.us-east-1.aws.neon.tech/neondb?pgbouncer=true&connect_timeout=15

# Direct connection (no pooler, for migrations)
postgresql://user:password@ep-example-123456.us-east-1.aws.neon.tech/neondb
```

> **Important:** For Vercel serverless functions (Express API), always use the **pooled connection string** (`?pgbouncer=true`) to avoid exhausting database connections.

---

## 3. Provisioning — Alternatives

### 3.1 Supabase

1. Visit [supabase.com](https://supabase.com) → New project.
2. Create **two projects**: `handmade-shop-staging` and `handmade-shop-prod`.
3. Under **Project Settings → Database**, copy the connection string.
4. For serverless (Vercel), use the **pooled connection** — change the port from `5432` to `6543` and append `?pgbouncer=true`:

```
# Staging — pooled (for Vercel / serverless)
postgresql://postgres:password@db.xxxxxxx.supabase.co:6543/postgres?pgbouncer=true&connect_timeout=15

# Production — pooled (for Vercel / serverless)
postgresql://postgres:password@db.xxxxxxx.supabase.co:6543/postgres?pgbouncer=true&connect_timeout=15

# Direct connection (for local tools / migrations)
postgresql://postgres:password@db.xxxxxxx.supabase.co:5432/postgres
```

### 3.2 Railway

1. Visit [railway.app](https://railway.app) → New Project → Provision PostgreSQL.
2. Do this twice — one for staging, one for production.
3. Railway auto-generates a connection string visible in the dashboard.

Connection string (Railway uses private networking):

```
postgresql://postgres:password@containername.railway.internal:5432/railway
```

### 3.3 Render

1. Visit [render.com](https://render.com) → **New PostgreSQL**.
2. Create two instances: `handmade-shop-db-staging` and `handmade-shop-db-prod`.
3. For the free tier, set **Instance Type = Free** (expires after 90 days).
4. Connection string is in the **Connections** panel.

```
postgresql://user:password@host.render.com:5432/dbname
```

---

## 4. Prisma Configuration

### 4.1 Schema (already in place)

Your `apps/api/prisma/schema.prisma` already uses `env("DATABASE_URL")`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

No changes needed — Prisma reads `DATABASE_URL` at runtime.

### 4.2 Environment-Specific Connection Strings

Create two `.env` files for local testing (these are in `.gitignore`):

**`.env.staging`**

```env
DATABASE_URL="postgresql://user:password@ep-rough-rice-123456.us-east-1.aws.neon.tech/neondb?pgbouncer=true&connect_timeout=15"
```

**`.env.production`**

```env
DATABASE_URL="postgresql://user:password@ep-cold-snow-789012.us-east-1.aws.neon.tech/neondb?pgbouncer=true&connect_timeout=15"
```

### 4.3 Prisma Client Generation

Prisma Client embeds the database schema, not the connection URL. So you can build the client once and use it with different `DATABASE_URL` values per environment.

```
pnpm --filter @handmade-shop/api prisma:generate
```

---

## 5. CircleCI Environment Variables

In the **CircleCI project settings**, set these project-level environment variables:

| Variable               | Value                               | Example                           |
| ---------------------- | ----------------------------------- | --------------------------------- |
| `DATABASE_URL_STAGING` | Staging pooled connection string    | `postgresql://...?pgbouncer=true` |
| `DATABASE_URL_PROD`    | Production pooled connection string | `postgresql://...?pgbouncer=true` |

These are used by the `build-and-deploy-staging` and `build-and-deploy-production` jobs respectively (see `.circleci/config.yml`).

---

## 6. Running Migrations

### 6.1 Local Development

```bash
# Create a new migration (auto-detect changes from schema.prisma)
pnpm db:migrate --name describe_your_change

# Apply migrations locally
pnpm --filter @handmade-shop/api prisma migrate dev
```

### 6.2 Staging (Automatic via CircleCI)

When code is pushed to the `staging` branch, CircleCI runs **after deployment**:

```bash
pnpm --filter @handmade-shop/api prisma migrate deploy
```

This applies any pending migrations to the staging database.

### 6.3 Production (Manual — Recommended)

**Why manual?** Production migrations can break things. Always run them manually after verifying on staging:

```bash
# 1. Verify on staging first
# 2. Generate migration locally
pnpm db:migrate --name my_change

# 3. Apply to production manually
DATABASE_URL="$(cat .env.production | grep DATABASE_URL | cut -d= -f2)" \
  pnpm --filter @handmade-shop/api prisma migrate deploy

# Or, log into production server and run:
pnpm --filter @handmade-shop/api prisma migrate deploy
```

> **If you prefer auto-migrations**, uncomment the migration step in the `build-and-deploy-production` job in `.circleci/config.yml`.

### 6.4 Production Checklist

Before each production migration:

- [ ] Migration ran successfully on **staging**
- [ ] Tested the staging deployment end-to-end
- [ ] Database has recent backup (see Section 8)
- [ ] Scheduled during low-traffic period
- [ ] Rollback plan ready (see Section 7)

---

## 7. Rollback Strategy

### 7.1 Schema Rollback

Prisma does not support automatic rollback of migrations. To roll back:

1. **Create a new migration** that reverses the change:

   ```bash
   # Add back the removed column, drop the added column, etc.
   pnpm --filter @handmade-shop/api prisma migrate dev --name rollback_xyz
   ```

2. **Deploy the rollback migration** to production:

   ```bash
   pnpm --filter @handmade-shop/api prisma migrate deploy
   ```

3. **Revert the code** by reverting the git commit and pushing.

### 7.2 Database Restore

If the database is corrupted:

1. **Neon:** Use the **branching feature** to restore from a point-in-time.
2. **Supabase:** Use the **Database Backups** page to restore.
3. **Railway/Render:** Use their point-in-time recovery or manual backup.

### 7.3 Code Rollback

```bash
git revert HEAD         # Revert last commit
# or
git revert <commit-hash>  # Revert specific commit
git push origin main
```

---

## 8. Backup Strategy

| Environment       | Frequency | Method                                               | Retention                |
| ----------------- | --------- | ---------------------------------------------------- | ------------------------ |
| **Production**    | Daily     | Provider's automated backup (Neon/Supabase built-in) | 7–30 days                |
| **Staging**       | Weekly    | `pg_dump` via cron                                   | 2 weeks                  |
| **Pre-migration** | On-demand | Manual `pg_dump`                                     | Until migration verified |

### Manual Backup Commands

```bash
# Backup production DB
pg_dump "$DATABASE_URL_PROD" > backup_$(date +%Y-%m-%d).sql

# Restore a backup
psql "$DATABASE_URL_PROD" < backup_2026-06-01.sql
```

---

## 9. Security Checklist

- [ ] **Connection strings use `?pgbouncer=true`** for serverless (Vercel) deployments
- [ ] **Connection strings use `?ssl=true`** or Neon's default SSL
- [ ] **IP restrictions** enabled on the database provider (whitelist Vercel's IPs + team IPs)
- [ ] **Database passwords** are at least 24 characters, randomly generated
- [ ] **Environment variables** stored in CircleCI (not committed to git — already in `.gitignore`)
- [ ] **Least privilege** — the database user should only have access to the one database
- [ ] **No direct prod access** for staging CI jobs — each job uses its own `DATABASE_URL_*`
- [ ] **Audit logging** enabled if the provider supports it

---

## 10. Troubleshooting

### "Can't reach database server" (ECONNREFUSED)

1. Check that the database is running (provider dashboard).
2. Verify the connection string has no typos.
3. If using Vercel + Neon: ensure you're using the **pooled** connection string.
4. If using Vercel + private networking (Railway): Vercel can't access private networks — use a public connection string or set up a bastion.

### "Too many connections" on Vercel

Serverless functions create many concurrent connections. Always configure **connection pooling**:

- **Neon:** Use the pooled URL (`?pgbouncer=true`). Set `connect_timeout=15`.
- **Supabase:** Use port **6543** (PgBouncer + `?pgbouncer=true`) instead of 5432.
- **Render:** Enable connection pooling in the dashboard.

### "PrismaClientInitializationError" after deploy

Prisma Client must match the schema used in `prisma migrate deploy`. Always:

1. Generate Prisma Client **before** deploying (`prisma:generate` step in CI).
2. Run `prisma migrate deploy` **after** deployment.

### Migrations fail with "relation already exists"

The migration was already partially applied. Run:

```bash
pnpm --filter @handmade-shop/api prisma migrate resolve --applied <migration_name>
```

### Branching in Neon: data not visible in staging

Neon branches use **copy-on-write** — the staging branch starts with a full snapshot of the production data instantly. No manual data copy is needed. If you don't see the data, verify:

1. You're using the **branch's connection string** (not the parent's).
2. The branch was created from the correct parent and snapshot.

If you're using **separate Neon projects** (not branches) and need to copy production data to staging:

```bash
pg_dump "$DATABASE_URL_PROD" | psql "$DATABASE_URL_STAGING"
```

---

## 11. Quick-Start Cheat Sheet

### First-Time Setup

```bash
# Step 1: Provision databases via provider dashboard
# Step 2: Get connection strings

# Step 3: Create local env files
echo 'DATABASE_URL="postgresql://..."' > .env.staging
echo 'DATABASE_URL="postgresql://..."' > .env.production

# Step 4: Test connection
DATABASE_URL=$(cat .env.staging | grep DATABASE_URL | cut -d= -f2-)
pnpm --filter @handmade-shop/api prisma db push  # or: prisma migrate deploy

# Step 5: Set CircleCI env vars (via CircleCI dashboard)
#   DATABASE_URL_STAGING     = staging pooled URL
#   DATABASE_URL_PROD        = production pooled URL

# Step 6: Push to staging → triggers deploy + migration
git checkout -b staging
git push origin staging
```

### Daily Workflow

```bash
# 1. Make schema changes
# 2. Create migration
pnpm db:migrate --name add_field_xyz

# 3. Push to staging → CI applies migration
git push origin staging

# 4. Test on staging
# 5. Merge to main → CI deploys (but does NOT auto-migrate)
git checkout main
git merge staging
git push origin main

# 6. Manually run production migration
DATABASE_URL_PROD=$(cat .env.production | grep DATABASE_URL | cut -d= -f2-)
DATABASE_URL="$DATABASE_URL_PROD" pnpm --filter @handmade-shop/api prisma migrate deploy
```

---

## Appendix: Connection URLs Reference

### PostgreSQL URL Format

```
postgresql://[user]:[password]@[host]:[port]/[database][?params]
```

### Common Query Parameters

| Parameter            | Value         | Purpose                          |
| -------------------- | ------------- | -------------------------------- |
| `pgbouncer=true`     | Neon/Supabase | Enable connection pooling        |
| `connect_timeout=15` | All           | Increase timeout for cold starts |
| `sslmode=require`    | All           | Enforce SSL (should be default)  |

> **Note:** `connectionLimit` and `pool_timeout` are not PostgreSQL URL parameters. They are Prisma datasource options set in `schema.prisma`:
>
> ```prisma
> datasource db {
>   provider        = "postgresql"
>   url             = env("DATABASE_URL")
>   connectionLimit = 5    // Max connections per PrismaClient instance
> }
> ```
>
> For serverless (Vercel) deployments, this is important to prevent connection pool exhaustion.
