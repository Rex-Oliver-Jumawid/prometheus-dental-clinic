# Architecture

## One application, one deployment

Prometheus Dental Clinic is a feature-oriented modular monolith: a React/Vite
SPA and Hono API deployed together on Vercel. `api/index.ts` exports a Node.js
fetch handler. Vercel bundles its imports; NodeNext checks and explicit `.js`
imports prevent the extensionless ESM failure fixed on the working preview branch.

`vercel.json` routes `/api` and `/api/*` to that function before filesystem or
SPA fallback. API responses retain JSON errors and Hono security headers. Other
requests receive static security headers, then existing files or `index.html`
for TanStack navigation. Static delivery does not invoke the API. Function
compute is in Singapore (`sin1`), near the Singapore Supabase region when available.

## Boundaries and organization

`src/` runs in browsers, `server/` in Node and `shared/` contains only portable
contracts. Strict TypeScript passes separate these environments; ESLint rejects
server imports in browser modules. Secrets and database clients never belong in
shared modules. Same-origin fetch needs no permissive CORS middleware.

Business features live under `src/features/<feature>/` and
`server/features/<feature>/`. Routes compose features. Handlers validate input,
authorize, invoke queries and translate results. Extract shared code only for
actual reuse or independently testable behavior; avoid speculative layers.

TanStack Router uses a code-based route tree. Protected loaders require server
sessions. Tailwind 4, semantic tokens and accessible controls provide the UI;
React and all existing feature components remain unchanged by the migration.

## API and authentication

Hono returns uncached JSON, health 200, unsupported health methods 405, safe
404s and sanitized exceptions. Protected routes first enforce the current
database session, role and ban status. Clinical-only access checks the dentist
flag on the server. Request logs contain only method, status and duration;
error diagnostics contain fixed categories and configuration names or allowlisted
PostgreSQL codes, never exception text or request data.

Better Auth uses native Node AsyncLocalStorage, Drizzle and database sessions.
`server/env.ts` adapts process variables to a portable request environment.
Production uses the configured HTTPS auth origin or the exact canonical domain
supplied by Vercel through `VERCEL_PROJECT_PRODUCTION_URL`. Preview requests use only
exact origins from Vercel's deployment/branch metadata, never wildcard hosts or
client-controlled forwarding headers. All mutation CSRF checks remain enabled.
Vercel's overwritten `x-vercel-forwarded-for` is the only trusted IP header;
local development overwrites it from the socket. Rate limits persist in Neon.
See [authentication](authentication.md).

## Persistence

`server/db/client.ts` provides a request-scoped Drizzle wrapper around a
single reusable `pg` Pool per server credential. It uses Supabase PostgreSQL
transaction pooling with unnamed statements and a limit of one app connection
per warm Vercel instance. The database URL is never exposed to the browser.
Interactive transactions are supported.

Staff lifecycle mutations lock `auth_user` before reading a fresh
READ COMMITTED snapshot in the same transaction. The account update, session
revocation and audit entry commit atomically. Clinical history triggers and
the dentist exclusion constraint are preserved from the existing migrations.

Drizzle Kit reads the separate `DATABASE_URL_UNPOOLED` only for deliberate
operator-run migrations to a new empty database; no migration runs in builds
or requests. The SQL schema still uses the `public` namespace, so Supabase's
`anon` and `authenticated` PostgREST roles are explicitly revoked before
and after migration. Better Auth remains the application's authentication
source; no Supabase Auth or client-side database API is used. See
[Supabase setup](supabase-setup.md).

## Development and verification

`pnpm dev` starts Vite and a minimal loopback Node Hono server, with frontend hot
reload, backend watch mode and `/api` proxying. `pnpm preview` serves built assets
and the same API on port 4180. Neither requires another application service.

Vitest uses Node for API tests and jsdom for React. The plain emitted-ESM test
checks actual Node resolution. Guarded live harnesses launch Node test entries,
verify credentials before SQL and clean synthetic accounts. They never appear
in the deployed entry. GitHub CI is credential-free; Vercel Git integration
builds previews. See [verification](verification.md) and [deployment](deployment.md).
