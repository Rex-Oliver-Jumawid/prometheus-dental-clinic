import type { ServerEnv } from '../env.js';
import { ConfigurationError } from '../configuration-error.js';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

// A warm Vercel instance reuses a single small pool rather than allocating
// connections on every request. Database URLs are server-only configuration.
const pools = new Map<string, pg.Pool>();

export function createDatabase(env: Pick<ServerEnv, 'DATABASE_URL'>) {
  const connectionString = env.DATABASE_URL;
  if (!connectionString?.trim()) {
    throw new ConfigurationError('DATABASE_URL', 'missing');
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new ConfigurationError('DATABASE_URL', 'invalid');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !url.pathname ||
    url.pathname === '/'
  ) {
    throw new ConfigurationError('DATABASE_URL', 'invalid');
  }

  let pool = pools.get(connectionString);
  if (!pool) {
    // node-postgres uses unnamed queries by default, which are compatible with
    // Supabase's transaction pooler (port 6543).
    pool = new pg.Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
    pool.on('error', () => {
      // Prevent an unhandled error from an idle connection from crashing Node.
      // Retire this pool; the next request will create a fresh one.
      if (pools.get(connectionString) === pool) pools.delete(connectionString);
    });
    pools.set(connectionString, pool);
  }
  return drizzle(pool, { schema });
}
