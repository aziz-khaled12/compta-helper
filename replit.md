# DJERDJERA Comptable

A French-language accounting application for **EURL DJERDJERA**, an Algerian small business. Built as a single-tenant web app: one company profile per installation.

## Features

- **Tableau de bord (Dashboard)** — KPI tiles, 12-month P&L chart, recent activity feed, TVA position.
- **Identité & Capital** — Company legal info (NIF, AI, address, legal form) and funding entries (capital contributions and bank loans).
- **Immobilisations (Fixed Assets)** — Asset register with automatic monthly straight-line depreciation; per-asset amortization schedule.
- **Journal** — Sales / purchases / expenses with auto-computed TVA (default 19%) and TTC, payment method and status, third-party tracking.
- **Stocks (Inventory)** — Items split between raw materials, finished goods, and supplies; IN/OUT movements; weighted-average cost.
- **Personnel (Employees)** — Roster with base salary, family situation, hire date, experience years.
- **Paie (Payroll)** — Monthly payslip generation with Algerian CNAS (9%), prime d'ancienneté (2%/year capped at 25y), and progressive IRG with child-based abatements.

All amounts are formatted as Algerian Dinars (`DA`) in `fr-DZ` locale.

## Algerian Payroll Rules

Implemented in `artifacts/api-server/src/lib/payroll.ts`:

- **CNAS (employee share):** 9% of gross salary.
- **Prime d'ancienneté:** 2% of base × experience years, capped at 25 years (max 50%).
- **IRG monthly brackets (DA):** 0–30k → 0%, 30–35k → 23%, 35–70k → 27%, 70–140k → 30%, 140k+ → 35%.
- **Child abatement on IRG:** 0/0/5/10/15/20% based on family situation (single, married, +1, +2, +3, +4 children).

## Architecture

pnpm monorepo with three artifacts and shared libs:

```
artifacts/
  api-server/                Express API (path /api)
  djerdjera-comptable/       React + Vite frontend (path /)
  mockup-sandbox/            Design exploration sandbox
lib/
  api-spec/                  OpenAPI spec (source of truth)
  api-zod/                   Generated Zod schemas (orval)
  api-client-react/          Generated React Query hooks (orval)
  db/                        Drizzle schema + DB client
```

Contract-first: edit `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` to regenerate Zod schemas and React Query hooks.

## Database (PostgreSQL via Drizzle)

Tables (`lib/db/src/schema/`):
- `companies`, `funding_entries`
- `fixed_assets`, `amortization_logs` (auto-populated for full lifeYears×12 months on asset creation)
- `transactions` (HT, TVA rate, computed TVA + TTC stored)
- `inventory_items`, `inventory_movements`
- `employees`, `payrolls`

All numeric columns use Postgres `numeric` (precision 18, scale 2 for money; 6.3 for rates) and are converted via `Number()`/`String()` at the boundary.

Single-tenant: helpers in `artifacts/api-server/src/lib/companyContext.ts` (`getActiveCompanyId`, `requireActiveCompanyId`).

## Key implementation notes

- **Date handling:** Generated Zod schemas use `z.coerce.date()` so route handlers convert `Date` back to `YYYY-MM-DD` strings before insert via `toIsoDate()` in `artifacts/api-server/src/lib/dates.ts`.
- **Asset depreciation:** On asset creation, `routes/assets.ts` inserts one row per month into `amortization_logs` for the full life span. Book value is computed live from purchase date and elapsed months.
- **Transaction TVA/TTC:** Computed server-side from `amountHt` and `tvaRate` so totals always reconcile.
- **Payroll idempotency:** Generating a payslip for an `(employeeId, monthYear)` deletes any prior row before inserting, so re-running is safe.
- **Frontend cache invalidation:** Mutations invalidate the relevant query keys via `getXxxQueryKey()` helpers from the generated client.

## Workflows

- `artifacts/api-server: API Server` — Express on `:8080`, served at `/api`.
- `artifacts/djerdjera-comptable: web` — Vite dev server, served at `/`.
- `artifacts/mockup-sandbox: Component Preview Server` — design sandbox at `/__mockup`.

## Common commands

- `pnpm run typecheck` — full repo typecheck.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate Zod + React Query client.
- `pnpm --filter @workspace/db run push` — push Drizzle schema to the DB.
