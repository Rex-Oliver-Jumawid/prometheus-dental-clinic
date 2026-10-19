# Vercel deployment with Supabase PostgreSQL

The application remains a React/Vite SPA and Hono Node API in one Vercel
project. `vercel.json` selects Vite, `pnpm build:vercel`, `dist/client`,
and Singapore function compute. Select Node 24.x, matching `.node-version`.

Before deploying, follow [Supabase setup](supabase-setup.md) to initialize
and secure a **dedicated test database**. Supabase is the database host;
it does not serve this website.

## Vercel environment scopes

| Scope      | Environment                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Local      | Ignored `.env.local`: Supabase pooler URL, direct migration URL, auth secret and localhost origin |
| Preview    | Server-only `DATABASE_URL` for test Supabase, separate `BETTER_AUTH_SECRET`                       |
| Production | Distinct production database credentials and auth secret, only after release approval             |

Set `DATABASE_URL` to the Supabase **transaction pooler on port 6543**,
not the Supabase project HTTPS API URL. Use `DATABASE_URL_UNPOOLED` only
for manual migrations and **never** configure it for Vercel runtime.
Never place database credentials or auth secrets into `VITE_*`.

Use `BETTER_AUTH_URL` with the exact staff-facing HTTPS production origin
(no trailing slash). The canonical production domain supplied through
`VERCEL_PROJECT_PRODUCTION_URL` is accepted independently. Vercel previews
derive approved origins from exact `VERCEL_URL` and `VERCEL_BRANCH_URL`
metadata. Keep automatic system variables enabled; do not add wildcard
origins.

Every non-production branch should deploy as a protected Vercel preview.
Keep Preview and Production database URLs and auth secrets separate:
setting one Vercel variable across both scopes shares credentials.
Changing environment settings requires a fresh deployment.

## Verification and release

Use GitHub Actions checks (`pnpm check` and high-severity audit) before
merging. The app does not apply database migrations on builds or requests.
Verify a preview with synthetic accounts and patients:

- Public `/api/health` 200; protected APIs 401 without sessions.
- Login, CSRF rejection, HTTP-only/SameSite/Secure cookies, persistent rate limit.
- Patient and appointment CRUD, dentist overlap rejection, clinical revision audit.
- Administrator lifecycle permissions, password changes, and session revocation.
- Direct SPA navigation, reloads, private asset scans, safe logs, and logout.

Keep Vercel deployment protection enabled for previews. Do not disclose
database passwords, session cookies or patient information in deployment logs.
Release to production only with explicit authorization, independent backups,
least-privilege runtime DB role, and the completed
[production security checklist](security.md).

On a configuration error, the public health endpoint may still return 200
while login fails. Review only sanitized error codes (for example PostgreSQL
`28P01` authentication errors and `42P01` missing schema); never log URLs
or raw SQL exceptions.
