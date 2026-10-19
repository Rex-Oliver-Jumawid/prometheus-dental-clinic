import { defineConfig } from 'drizzle-kit';

// Node loads ignored env files through the db:* scripts. Generation is offline.
// Migrations use a direct or session-pooler URL, never the transaction pooler.
const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './drizzle',
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
