# Project knowledge

This file gives Freebuff context about your project: goals, commands, conventions, and gotchas.

## What this is

An internal management system for a handmade shop — a full-stack web application for managing products (BASE and CHARM types), recipes, packaging templates, inventory, orders, shipping, and cost/profit calculations. Currently in the documentation/planning phase — no source code has been implemented yet.

## Stack (planned)

- **Framework:** Next.js (UI) + Express (API)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Prisma ORM
- **Infra:** Docker Compose
- **Monorepo:** pnpm Workspace
- **Validation:** Zod
- **Linting/Formatting:** ESLint + Prettier

## Project status

- **Phase:** Documentation & planning complete. Implementation not yet started.
- **All specs live in `docs/`** — 19 markdown files covering every domain (orders, inventory, shipping, cost engine, packaging, reports, auth, etc.)
- **AI agent definitions in `.agents/`** — custom Freebuff agents for assisted development

## Quickstart (when implementation begins)

- **Install:** `pnpm install`
- **Dev:** `pnpm dev` (runs Next.js + Express concurrently)
- **DB:** `docker compose up -d` then `pnpm prisma migrate dev`
- **Test:** `pnpm test` (Vitest for unit + integration tests)
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`

## Architecture

- **Modular Monolith** — organized by domain (products, orders, inventory, shipping, packaging, reports, auth)
- **Layer pattern:** UI → API (thin controllers) → Service (business logic) → Repository (data access) → Prisma → PostgreSQL
- **Key directories (future):**
  - `apps/web/` — Next.js frontend
  - `apps/api/` — Express backend
  - `packages/` — Shared libraries (types, validation, utils)

## Conventions

- **TypeScript:** Strict mode enabled. No `any` types.
- **Repository pattern:** All database access goes through repository classes.
- **Business logic:** Always in service layer, never in controllers or UI.
- **Validation:** Zod schemas on all API inputs.
- **Soft deletes:** Use `deletedAt` timestamp on all entities.
- **IDs:** UUID v4 for all primary keys.
- **Audit fields:** `createdAt`, `updatedAt`, `deletedAt` on every model.
- **Inventory:** Never edit stock directly — only via `InventoryTransaction` (IMPORT, SALE, ADJUSTMENT).
- **Pricing:** Sale price is manual. Cost is calculated by Cost Engine (material + packaging).
- **Order workflow:** Draft → Waiting Confirm → In Progress → Packaging → Ready To Ship → Completed.
- **Shipping:** Tracked as a separate domain from order status.
- **Testing:** Unit tests for services, integration tests for APIs.

## Gotchas

- No SKU field for custom products.
- Recipe and Packaging are templates, not concrete records.
- Cost Rule only calculates material cost — packaging costs are separate.
- Prices/costs are snapshotted on order confirmation (don't update dynamically after confirm).
- Spawnable agents use fully qualified IDs (e.g., `codebuff/file-picker@0.0.1`) or local agent filenames.
- Agent IDs must contain only lowercase letters, numbers, and hyphens.
- MCP server secrets in agent definitions use `$ENV_VAR` syntax (loaded from local environment).
- Always follow business rules in `docs/` before implementing — never infer missing logic.
