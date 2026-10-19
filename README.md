# Prometheus Dental Clinic

A React 19/Vite SPA and Hono Node API for staff accounts, patients,
appointments, and clinical records. It uses Drizzle ORM, Better Auth,
PostgreSQL and Vercel. Billing is planned in [the roadmap](docs/roadmap.md).

## Run locally

Use Node 24.19.0 and pnpm 12.10.1:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Vite runs at `http://127.0.0.1:5173` and proxies `/api` to the Hono
Node server on port 3001. Public `/api/health` does not need credentials;
staff features require an initialized database and an existing account.

## Supabase PostgreSQL

This branch replaces the Neon HTTP-specific database driver with
`drizzle-orm/node-postgres` and node-postgres `pg`. **Supabase hosts the
database, not the web application.** The frontend and API are deployed together
on Vercel. Existing Better Auth remains the authentication system; do not
replace it with Supabase Auth without a separately reviewed migration.

Follow [Supabase setup](docs/supabase-setup.md) before creating tables.
Use a **new, empty test Supabase project** and preserve the old Neon database
unchanged. Do not copy real patient records into a test database.

Local `.env.local` contains the server-only `DATABASE_URL` (Supabase
transaction pooler, port 6543), `DATABASE_URL_UNPOOLED` (direct or session
pooler, port 5432), `SUPABASE_PROJECT_REF`, `BETTER_AUTH_SECRET`, and
`BETTER_AUTH_URL`. See [.env.example](.env.example) for exact placeholders.
The URL user, password and pooler hostname must be copied from the project
Connect panel. Do not share them or commit them to GitHub.

Apply the checked-in Drizzle migrations once to the **new database**, after
locking down public API roles as described in the setup guide:

```sh
pnpm db:migrate
```

No schema migration runs during build, deployment, or HTTP requests. Never
point migration commands at the former Neon production database.
Use a separate limited runtime role before handling real patient data.

## Commands

| Command                         | Purpose                                                             |
| ------------------------------- | ------------------------------------------------------------------- |
| `pnpm dev`                      | Vite and Hono Node development                                      |
| `pnpm check`                    | Typecheck, lint, formatting, tests and build                        |
| `pnpm audit --audit-level=high` | High-severity dependency audit                                      |
| `pnpm db:generate`              | Generate and review schema changes, not needed for first setup      |
| `pnpm db:migrate`               | Apply checked-in migrations to the selected database                |
| `pnpm db:verify`                | Guarded live SQL and transaction checks on a dedicated test project |
| `pnpm auth:verify`              | Guarded live login and session verification                         |
| `pnpm workflows:verify`         | Guarded synthetic clinic workflows with cleanup                     |
| `pnpm auth:bootstrap`           | Create first _test_ administrator if the auth table is empty        |
| `pnpm preview`                  | Build and serve a local production preview                          |

The synthetic-data commands require a dedicated Supabase test project and
matching project identity in `.env.local`. They refuse unexpected credentials.
They must not run against a live patient database.

## Deployment

The Vercel project builds with `pnpm build:vercel`. The existing `vercel.json`
routes `/api` to Hono and serves the SPA for other routes. Configure production
and preview credentials independently and keep the runtime URL server-only.
Refer to [deployment](docs/deployment.md) and [verification](docs/verification.md).

`src/` contains browser features; `server/` contains Hono, Better Auth and
database code; `shared/` contains runtime-independent contracts; `drizzle/`
contains reviewed SQL migrations and metadata. Authentication and authorization
are enforced on the server.

**No real patient information should be processed until the
[production security checklist](docs/security.md) is completed**, including
least-privilege runtime roles, API-role revocation, recovery procedures,
audit retention, and tested backups.
