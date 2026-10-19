import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Operator-only guard shared by synthetic-data tools; never deployed.
// A test run must never accidentally target an unrelated or live clinic.
export function developmentEnv(origin = 'http://127.0.0.1:4180') {
  const local = parseEnv(readFileSync('.env.local', 'utf8'));
  const ref = local.SUPABASE_PROJECT_REF;
  assert.match(ref ?? '', /^[a-z0-9]{20}$/, 'Select a dedicated Supabase test project');
  assert.ok(
    local.DATABASE_URL &&
      local.DATABASE_URL_UNPOOLED &&
      local.BETTER_AUTH_SECRET,
  );
  for (const source of [
    process.env,
    ...(existsSync('.env') ? [parseEnv(readFileSync('.env', 'utf8'))] : []),
  ]) {
    for (const key of [
      'DATABASE_URL',
      'DATABASE_URL_UNPOOLED',
      'BETTER_AUTH_SECRET',
      'SUPABASE_PROJECT_REF',
    ]) {
      assert.ok(
        !source[key] || source[key] === local[key],
        'Conflicting server environment',
      );
    }
  }

  const pooled = new URL(local.DATABASE_URL);
  const migration = new URL(local.DATABASE_URL_UNPOOLED);
  assert.match(pooled.hostname, /^[a-z0-9-]+\.pooler\.supabase\.com$/);
  assert.equal(pooled.username, `postgres.${ref}`);
  assert.equal(pooled.port, '6543');
  assert.equal(pooled.pathname, '/postgres');
  const isDirect =
    migration.hostname === `db.${ref}.supabase.co` &&
    migration.username === 'postgres';
  const isSessionPooler =
    migration.hostname === pooled.hostname &&
    migration.username === `postgres.${ref}`;
  assert.ok(isDirect || isSessionPooler, 'Migration URL must belong to the same project');
  assert.ok(migration.port === '' || migration.port === '5432');
  assert.equal(migration.pathname, '/postgres');
  assert.equal(pooled.searchParams.get('sslmode'), 'require');
  assert.equal(migration.searchParams.get('sslmode'), 'require');

  const url = new URL(origin);
  assert.equal(url.origin, origin);
  assert.ok(
    url.protocol === 'https:' ||
      (url.protocol === 'http:' && url.hostname === '127.0.0.1'),
  );
  return {
    DATABASE_URL: local.DATABASE_URL,
    DATABASE_URL_UNPOOLED: local.DATABASE_URL_UNPOOLED,
    BETTER_AUTH_SECRET: local.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: origin,
  };
}
