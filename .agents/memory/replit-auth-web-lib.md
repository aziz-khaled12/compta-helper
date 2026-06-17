---
name: replit-auth-web lib setup
description: How to configure the replit-auth-web shared lib for Vite+React auth hook in this monorepo.
---

## Rule
The `lib/replit-auth-web` composite lib requires `vite` as a devDependency so that `import.meta.env` resolves during `tsc --build`. Without it, `typecheck:libs` (run inside codegen) fails with "Cannot find type definition file for 'vite/client'".

**Why:** The `use-auth.ts` hook uses `import.meta.env.BASE_URL` to build the login redirect URL. This is a Vite runtime global, so the `vite` package must be installed (for its `client.d.ts` type declarations) even though the lib itself never runs Vite.

**How to apply:** Whenever adding a new lib that consumes `import.meta.env`, add `"vite": "catalog:"` to its `devDependencies` and `"types": ["vite/client"]` to its `tsconfig.json`. Then run `pnpm install` before `codegen`.

## Auth flow
- `/api/auth/user` — returns `{ user: AuthUser | null }`. Frontend polls this on mount.
- `/api/login?returnTo=<path>` — starts OIDC/PKCE flow, redirects back to `returnTo` on success.
- `/api/logout` — clears session cookie, redirects to OIDC end_session.
- Company is linked to user via `companies.userId` column. `getActiveCompanyId(userId?)` in `companyContext.ts` does user-scoped lookup with fallback to first company for legacy data.

## Onboarding gating
App.tsx gates behind auth: unauthenticated → Login page; authenticated + no company → Onboarding wizard; authenticated + company → main app. The `useGetCompany` query is `enabled: isAuthenticated` so it only fires after auth resolves.
