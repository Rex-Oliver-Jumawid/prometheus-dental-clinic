import type { ServerEnv } from '../../server/env.js';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { app as application } from '../../server/app';
import { createDatabase } from '../../server/db/client';

// Test-only entry point. The application's entry point never imports this file.
const app = new Hono<{ Bindings: ServerEnv }>();
app.get('/api/__verify/database', async (c) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(c.env.DATABASE_URL),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

  // Refuse all SQL until the harness confirms the actual Hono binding matches
  // the selected development credentials. Never return the URL or fingerprint.
  if (fingerprint !== c.req.header('X-Expected-Database-Fingerprint')) {
    return c.json({ error: 'Database binding mismatch' }, 400);
  }

  const db = createDatabase(c.env);
  const result = await db.execute(sql`SELECT 1 AS value`);
  const transaction = await db.transaction(async (tx) => {
    const first = await tx.execute<{ value: number; transaction: string }>(
      sql`SELECT 1 AS value, txid_current()::text AS transaction`,
    );
    const second = await tx.execute<{ value: number; transaction: string }>(
      sql`SELECT 2 AS value, txid_current()::text AS transaction`,
    );
    return [first, second] as const;
  });

  let failedTransactionRejected = false;
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT 1`);
      await tx.execute(sql`SELECT 1 / 0`);
    });
  } catch {
    failedTransactionRejected = true;
  }

  const recovered = await db.execute(sql`SELECT 1 AS value`);
  return c.json({
    credentialsMatch: true,
    selectOne: result.rows[0]?.value === 1,
    transactionValues: [
      transaction[0].rows[0]?.value,
      transaction[1].rows[0]?.value,
    ],
    statementsShareTransaction:
      typeof transaction[0].rows[0]?.transaction === 'string' &&
      transaction[0].rows[0]?.transaction ===
        transaction[1].rows[0]?.transaction,
    failedTransactionRejected,
    recoveredAfterFailure: recovered.rows[0]?.value === 1,
  });
});

app.all('*', (c) => application.fetch(c.req.raw, c.env));
export default { fetch: app.fetch };
