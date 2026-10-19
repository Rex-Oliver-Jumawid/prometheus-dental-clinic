import { describe, expect, it, vi } from 'vitest';
import { createDatabase } from '../server/db/client';

const state = vi.hoisted(() => ({
  pools: [] as Array<Record<string, unknown>>,
}));

vi.mock('pg', () => ({
  default: {
    Pool: class {
      constructor(options: Record<string, unknown>) {
        state.pools.push(options);
      }
      on() {}
    },
  },
}));

describe('Server database client', () => {
  it.each(['', '   '])(
    'rejects a missing connection without private details',
    (url) => {
      expect(() => createDatabase({ DATABASE_URL: url })).toThrow(
        'DATABASE_URL is missing',
      );
    },
  );

  it.each([
    'not-a-url',
    'https://user:password@example.test/postgres',
    'postgresql://example.test/postgres',
    'postgresql://user:password@example.test/',
  ])('rejects an invalid database connection', (url) => {
    expect(() => createDatabase({ DATABASE_URL: url })).toThrow(
      'DATABASE_URL is invalid',
    );
  });

  it('creates one bounded pool per server credential and reuses it', () => {
    const first =
      'postgresql://postgres.first:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require';
    const second =
      'postgresql://postgres.second:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require';
    const before = state.pools.length;

    createDatabase({ DATABASE_URL: first });
    createDatabase({ DATABASE_URL: first });
    createDatabase({ DATABASE_URL: second });

    expect(state.pools).toHaveLength(before + 2);
    expect(state.pools.at(-2)).toMatchObject({
      connectionString: first,
      max: 1,
      allowExitOnIdle: true,
    });
    expect(state.pools.at(-1)).toMatchObject({
      connectionString: second,
      max: 1,
      allowExitOnIdle: true,
    });
  });
});
