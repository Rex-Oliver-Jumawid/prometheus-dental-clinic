-- Run on a NEW, dedicated Supabase project, before and after Drizzle migrations.
-- This clinic uses Better Auth + a server-side SQL connection, not PostgREST.
-- Do not execute on a shared Supabase project with unrelated API consumers.
BEGIN;

-- No direct access to public schema objects from browser-facing API roles.
REVOKE ALL ON SCHEMA public FROM anon, authenticated;

-- Tables created by the postgres migration role must not inherit API grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- Idempotently revoke table rights if the app tables already exist.
DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname IN (
        'auth_user', 'auth_account', 'auth_session', 'auth_verification',
        'auth_rate_limit', 'patients', 'appointments', 'dental_records',
        'dental_record_history', 'staff_audit'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',
      target.relname
    );
  END LOOP;
END;
$$;

COMMIT;
