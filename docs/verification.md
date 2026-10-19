# Verification

## CI without external credentials

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm audit --audit-level=high
```

CI checks frontend, Node server and tools typechecks, lint, Prettier,
unit tests, and Vite build. No private database credentials are required.

## Live Supabase test project

Follow [Supabase setup](supabase-setup.md) and verify the six migrations,
schema grants, scheduling exclusion constraint and clinical history trigger.
Set `.env.local` with the dedicated test Supabase project ref and matching
runtime/migration URLs. `scripts/development-env.ts` rejects conflicting
credentials, incorrect project refs or mismatched pooler/direct endpoints
before any synthetic SQL runs.

```sh
pnpm db:verify
pnpm auth:verify
BETTER_AUTH_URL=http://127.0.0.1:4180 pnpm preview
```

The database harness checks real Node/PostgreSQL queries, a shared
transaction, a failed transaction and query recovery. The auth harness checks
hashing, login, sessions, staff/admin permissions, CSRF, expiry, logout and
database-backed rate limits.

Only on a dedicated test database, `pnpm workflows:verify` creates and
cleans synthetic patient, scheduling and clinical fixtures. Check
concurrent dentist-overlap errors, immutable record-history revisions and
staff session revocation. Do not run it against production patients.

## Vercel preview

Protect the preview and confirm its `DATABASE_URL` belongs to the same
test project before exercising write routes. Use existing Vercel CLI login
or origin-scoped preview protection credentials. Test navigation/reload,
HTTPS cookies, error envelopes, CSP, and invalid-origin CSRF behavior.
Private downloads, logs and bundles must not contain credentials or patient
details. Record any unverified steps; never promote a preview automatically.
