# AGENTS.md

French-language Algerian accounting app (EURL DJERDJERA): Express API + React/Vite SPA in a pnpm workspace. All UI text is French and Arabic; all money is `DA` in `fr-DZ`.

## Commands

```bash
pnpm install                                   # pnpm only — preinstall rejects npm/yarn
docker compose up -d db                        # local Postgres 16 (user/pass/db: postgres/postgres/compta_helper)
cp .env.example .env                           # only env source; gitignored

pnpm run typecheck                             # THE verification step (tsc --build libs, then artifacts)
pnpm run build                                 # typecheck, then per-package build

pnpm --filter @workspace/server run dev        # builds with esbuild, then runs dist/index.mjs
pnpm --filter @workspace/client run dev        # Vite on :5173, proxies /api -> :8080 (API must be running)
pnpm --filter @workspace/client run typecheck  # single package
pnpm --filter @workspace/api-spec run codegen  # orval + typecheck:libs
pnpm --filter @workspace/db run push           # drizzle-kit push (schema sync)
```

There is no test suite, linter, or formatter config — `pnpm run typecheck` plus `pnpm run build` is the whole gate.

## Layout

`artifacts/client` (SPA), `artifacts/server` (API), `lib/api-spec` (OpenAPI), `lib/api-zod` + `lib/api-client-react` (generated), `lib/db` (Drizzle), `lib/auth-web` (auth hook/context), `lib/sectors` (activity catalogue, fr+ar, used by client and legal matcher).

There is no README; this file is the entry point. Trust the tree over any stale prose.

## Contract-first API

- `lib/api-spec/openapi.yaml` is the source of truth. Edit it, then run codegen; never hand-edit `lib/api-zod/src/generated/**` or `lib/api-client-react/src/generated/**` (orval runs with `clean: true` and wipes them).
- Generated client is `baseUrl: "/api"`, `mode: "split"`, mutator `custom-fetch.ts`. Zod uses `coerce` + `useDates`, so request dates arrive as `Date` and must be written with `toIsoDate()` (`artifacts/server/src/lib/dates.ts`).
- Routes validate with the generated schemas (`CreateTransactionBody.safeParse(...)`) and parse responses through the generated `...Response.parse(...)`, so a contract drift fails at the route.
- Generated hooks require an explicit `queryKey` in their `query` option even though it defaults internally (see `App.tsx`).

## Boot and env gotchas

- The only `.env` is at the repo root. Server/client dev scripts pass `node --env-file=../../.env`; `lib/db/drizzle.config.ts` loads `../../.env` from the **process cwd**, so it must run from `lib/db` (which `pnpm --filter` does) — running `drizzle-kit` from the repo root will not find the file.
- The server refuses to start without `PORT`, `JWT_SECRET`, `GEMINI_API_KEY` (checked before `listen`) and `DATABASE_URL` (thrown by `lib/db` at import). Any non-empty `GEMINI_API_KEY` boots the server; only the crawl/narration routes actually call Gemini.
- `@workspace/server run dev` builds once then runs `dist/index.mjs` — no watch mode. Re-run it after server edits.
- The client build needs no env vars; only `vite dev`/`preview` needs `FRONTEND_PORT` (or `PORT`).

## Database

- `drizzle-kit push` is the only schema workflow — no migration files. `push` is interactive; `push-force` skips prompts.
- From outside Render/Neon use the **direct** (unpooled) URL plus `?sslmode=require`; PgBouncer transaction mode breaks `push`. Production wires the app to Neon's pooled `-pooler` URL, which is fine at runtime but not for `push`.
- Money/rate columns are Postgres `numeric` surfaced as strings: `Number()` on read, `String()` on write (see `routes/transactions.ts`).
- Multi-step writes use `db.transaction(...)`; a journal entry and its stock movement must land together.

## Tenancy and auth

- `companies.userId` is the entire tenancy model. `getActiveCompanyId(userId)` matches exactly and has no fallback — do not add one (a fallback would hand a new signup an existing company and skip onboarding). `userId` is a required parameter on purpose.
- Every `:id` lookup must also filter by `companyId`; foreign ids are silent no-ops.
- `authMiddleware` guards everything under `/api` except `/api/auth/*` and `/api/healthz`. Access JWT lives 15 min in memory only; refresh token is an httpOnly cookie (7 days), refreshed by the client every 12 min.
- The client never calls the API cross-origin in production (Vercel rewrite), so cookie defaults are `SameSite=Lax`; `COOKIE_SAMESITE`/`COOKIE_SECURE` are opt-in overrides.

## Conventions

- Screens live in `artifacts/client/src/pages/<name>/` as `index.tsx` + `components/` + `hooks/`, and must be registered in the `Switch` in `App.tsx` (wouter, not react-router). Routes are nested under `<Layout>`.
- Surface server refusals with `apiErrorMessage(error)` (`artifacts/client/src/lib/api-error.ts`); the API's French message is the only place the reason is spelled out. Don't replace it with a generic toast.
- Every user-facing string must exist in both `artifacts/client/src/i18n/fr.ts` and `ar.ts`. `i18n/index.ts` flips `<html dir>` to RTL for Arabic; French is the fallback. Server error messages are French.
- Format money with `fmt()` from `artifacts/client/src/lib/ledger.ts` (fr-DZ, `DA`, narrow no-break space grouping) — don't re-format or append `DA` twice.
- Payroll rules (CNAS 9%, ancienneté 2%/year capped at 25y, IRG brackets + child abatement) live in `artifacts/server/src/lib/payroll.ts`.
- Tax regime (forfaitaire/IFU → G12, réel → G50, IFU ceiling) lives in `artifacts/client/src/lib/taxRegime.ts`. The declared `companies.taxRegime` is authoritative; the derivation is only a fallback/consistency check.
- Insights are computed in the browser (`artifacts/client/src/lib/analytics/`); `POST /api/insights/narrate` only narrates the findings it receives and caches by findings hash per company. Gemini never computes figures — keep it that way. A missing/failed narration falls back to the knowledge-base text, never an error UI.
- The legal crawl scheduler is in-process (`artifacts/server/src/lib/scheduler.ts`) and guarded by a Postgres advisory lock. It is on unless `CRAWL_ENABLED=false`; production sets false because the free Render instance sleeps. The Gemini model id is pinned in `lib/gemini/client.ts`; `lib/gemini/smoke.ts` prints the live model list.
- UI primitives in `artifacts/client/src/components/ui` are shadcn (new-york, `components.json`); add via the shadcn CLI rather than hand-rolling. Path alias: `@/` → `artifacts/client/src`.

## Deploy

- Vercel builds only the client (`pnpm --filter @workspace/client run build`, output `artifacts/client/dist/public`) and rewrites `/api/*` to the Render host **hardcoded in `vercel.json`**; everything else falls back to `index.html`. Moving the API means editing that destination.
- Render builds and starts from the **repo root** so `@workspace/*` libs resolve — never set `rootDir` to `artifacts/server`. Artifact is `artifacts/server/dist/index.mjs`.
- `.vercelignore` is separate from `.gitignore` because `vercel deploy` uploads the working tree; it keeps `.env` and the agent dirs (`.agents`, `.opencode`, `CLAUDE.md`) out of the upload.

## Workspace quirks

- Node >= 24, pnpm 12.4.1 (pinned via `packageManager`).
- `minimumReleaseAge: 1440` blocks any version published less than a day ago. Don't disable it; add a package to `minimumReleaseAgeExclude` only for a trusted org, and remove it after a day.
- `pnpm-workspace.yaml` `overrides` deliberately strip non-linux-x64/non-win32 native binaries (esbuild, rollup, lightningcss, oxide); `allowBuilds`/`onlyBuiltDependencies` are reviewed choices. Don't "clean these up".
- `lib/*` are composite TS projects (`emitDeclarationOnly`, `dist/*.d.ts`). `typecheck:libs` (`tsc --build`) must run before artifact typechecks — that's why codegen ends with it. A lib that reads `import.meta.env` needs `"vite": "catalog:"` and `"types": ["vite/client"]`; `lib/auth-web` no longer does.
- `.agents/`, `.opencode/`, and `CLAUDE.md` are gitignored; `AGENTS.md` is not, so keep it committed.
