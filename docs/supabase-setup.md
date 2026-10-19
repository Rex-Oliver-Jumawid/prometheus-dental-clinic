# Supabase PostgreSQL setup

This guide uses **Supabase as PostgreSQL only**. Hono, Better Auth, Drizzle and
the React frontend remain in one Vercel app. Do not create Supabase Auth users,
API keys or Edge Functions for this migration.

## 1. Create and isolate a fresh database

Use a dedicated, empty Supabase project for the dental-clinic application.
The existing Neon database and its production environment must not be changed.
Never import real patient data into this test setup.

In Supabase SQL Editor, run [supabase-lockdown.sql](../scripts/supabase-lockdown.sql)
**before** creating the application's tables. It removes PostgREST access
grants from the `anon` and `authenticated` roles on the `public` schema,
including default grants for newly created tables. This application authenticates
through Better Auth on its server; direct browser access to the app tables is
not supported.

## 2. Copy database connection strings

Click **Connect** on the same Supabase project. Choose:

- **Transaction pooler, port 6543** for `DATABASE_URL` in Vercel and locally.
- **Direct connection, port 5432** for `DATABASE_URL_UNPOOLED` migrations.
  Direct connections usually require IPv6. If your operator machine has only
  IPv4, select the **Session pooler, port 5432** instead.

Copy the supplied host and username **exactly**. Shared pooler usernames
look like `postgres.PROJECT_REF`, whereas direct connections use `postgres`.
Do not construct pooler hostnames from project IDs. Set TLS with
`?sslmode=require` and percent-encode special characters in the URL password.

Copy [.env.example](../.env.example) to ignored `.env.local`, fill both
URLs, set `SUPABASE_PROJECT_REF` to the dedicated test project reference,
and set the local exact `BETTER_AUTH_URL`. Generate a random secret of at
least 32 characters for `BETTER_AUTH_SECRET`. Do not commit, print or
paste real database URLs or credentials into chat.

The node-postgres driver uses unnamed statements and a single connection
per warm serverless instance; it supports Supabase's transaction pooler.
The staff-account lifecycle uses a single SQL transaction so its last-admin
protection still works.

## 3. Apply the existing schema to the NEW database

Review the six checked-in Drizzle migrations (`0000` through `0005`).
Only after confirming both URLs target the **same new test project**:

```sh
pnpm db:migrate
```

This builds the app tables (`auth_*`, `patients`, `appointments`,
`dental_records`, `dental_record_history`, `staff_audit`) plus the
clinical audit trigger and scheduling exclusion constraint. The migrations
are not safe to replay against an already initialized clinic or an existing
Neon database.

Run [supabase-lockdown.sql](../scripts/supabase-lockdown.sql) again after
migration to revoke any grants on the actual app tables, then use the
Supabase SQL Editor to verify:

```sql
SELECT c.relname AS application_table,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_can_select
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('auth_user', 'auth_account', 'auth_session',
    'auth_verification', 'auth_rate_limit', 'patients', 'appointments',
    'dental_records', 'dental_record_history', 'staff_audit')
ORDER BY c.relname;
```

Both privilege columns must be `false` for every listed table.
Also review schema access and migration status. Do not proceed if any table
remains available to public API roles.

## 4. Verify and deploy

Run `pnpm check`, `pnpm audit --audit-level=high`, and guarded
`pnpm db:verify`, `pnpm auth:verify`, `pnpm workflows:verify` only
against the dedicated test project. Seed a synthetic administrator using
`pnpm auth:bootstrap` only if the table is empty. Never print credentials.

Connect the GitHub fork to a Vercel preview. Set the **Preview**
`DATABASE_URL`, `BETTER_AUTH_SECRET`, and exact auth origin for the
deployment. Keep Production credentials and deployment unchanged until
the preview passes login, permissions, patient CRUD, scheduling conflict,
dental audit history and logout checks. Read [deployment](deployment.md)
for production origin handling.

Supabase Free does not guarantee the backup/recovery and availability
requirements for real patient data. Before serving a real clinic, complete
[the security checklist](security.md) and test database and file restoration.
